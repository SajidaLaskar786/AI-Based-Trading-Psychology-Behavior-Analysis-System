import pandas as pd
import numpy as np
from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta

class Notification(BaseModel):
    id: str
    type: str  # 'overtrading', 'inconsistent_holding', 'revenge_trading', 'loss_chasing'
    severity: str  # 'warning', 'critical'
    title: str
    message: str
    metric_value: str
    threshold: str

class NotificationEngine:
    def __init__(self, trades_df: pd.DataFrame, window_days: int = 30):
        """
        Initialize the notification engine with a trade history dataframe.
        The dataframe is expected to be a 'round trip' dataframe from prepare_round_trip_df.
        """
        self.raw_df = trades_df.copy()
        
        # Ensure datetimes
        if "buy_date" in self.raw_df.columns:
            self.raw_df["buy_date"] = pd.to_datetime(self.raw_df["buy_date"])
        if "sell_date" in self.raw_df.columns:
            self.raw_df["sell_date"] = pd.to_datetime(self.raw_df["sell_date"])
            
        # Sort chronologically by entry
        self.raw_df = self.raw_df.sort_values(by="buy_date").reset_index(drop=True)
        
        # Filter to the rolling window if data exists
        if not self.raw_df.empty:
            max_date = self.raw_df["buy_date"].max()
            if pd.notna(max_date):
                cutoff = max_date - timedelta(days=window_days)
                self.df = self.raw_df[self.raw_df["buy_date"] >= cutoff].copy()
            else:
                self.df = self.raw_df.copy()
        else:
            self.df = self.raw_df.copy()
            
        # Calculate pre-requisite metrics
        self._calculate_metrics()

    def _calculate_metrics(self):
        df = self.df
        if df.empty:
            self.metrics = {}
            return

        # 1. Trading Frequency
        trades_per_month = len(df)
        
        # 2. Daily Trading Activity
        active_days = df["buy_date"].dt.date.nunique()
        avg_trades_per_day = trades_per_month / active_days if active_days > 0 else 0
        
        # 3. Holding times
        df["holding_time"] = (df["sell_date"] - df["buy_date"]).dt.total_seconds() / (24 * 3600)
        df["holding_time"] = df["holding_time"].clip(lower=0) # prevent negative if data anomaly
        holding_variance = df["holding_time"].var() if len(df) > 1 else 0.0
        avg_holding_days = df["holding_time"].mean()
        
        # 4. Winners vs Losers
        winners = df[df["pnl"] > 0]
        losers = df[df["pnl"] < 0]
        avg_holding_winners = winners["holding_time"].mean() if not winners.empty else 0.0
        avg_holding_losers = losers["holding_time"].mean() if not losers.empty else 0.0
        
        # 5. Time between trades (gaps)
        # Sort by buy date
        # Gap = Buy Date(N) - Sell Date(N-1)
        if len(df) > 1:
            prev_sell = df["sell_date"].shift(1)
            gaps = (df["buy_date"] - prev_sell).dt.total_seconds() / (24 * 3600)
            avg_gap = gaps[gaps > 0].mean() # only positive gaps (non-overlapping)
            if pd.isna(avg_gap):
                avg_gap = 0.0
        else:
            avg_gap = 0.0

        self.metrics = {
            "trades_per_month": trades_per_month,
            "avg_trades_per_day": avg_trades_per_day,
            "holding_variance": holding_variance,
            "avg_holding_days": avg_holding_days,
            "avg_holding_winners": avg_holding_winners,
            "avg_holding_losers": avg_holding_losers,
            "avg_gap_between_trades": avg_gap
        }

    def evaluate(self) -> List[Notification]:
        alerts = []
        if not hasattr(self, "metrics") or not self.metrics:
            return alerts
            
        metrics = self.metrics
        df = self.df
        
        # ─── Rule 1: Overtrading ─────────────────────────────────────────────
        # Critical Check
        if metrics["avg_gap_between_trades"] < 0.1 and metrics["avg_trades_per_day"] > 8:
            alerts.append(Notification(
                id="ot_crit_1",
                type="overtrading",
                severity="critical",
                title="Critical Overtrading Detected",
                message=f"You executed {metrics['trades_per_month']} trades recently with less than 2 hours between entries. Step away from the screens.",
                metric_value=f"{metrics['avg_gap_between_trades']*24:.1f} hrs gap",
                threshold="< 2.4 hrs"
            ))
        # Warning Check
        elif metrics["trades_per_month"] > 30 or metrics["avg_trades_per_day"] > 5:
            alerts.append(Notification(
                id="ot_warn_1",
                type="overtrading",
                severity="warning",
                title="High Trading Frequency",
                message=f"You're averaging {metrics['avg_trades_per_day']:.1f} trades per active day. Consider slowing down to review your setups.",
                metric_value=f"{metrics['avg_trades_per_day']:.1f} trades/day",
                threshold="> 5 trades/day"
            ))

        # ─── Rule 2: Inconsistent Holding Behavior ───────────────────────────
        if metrics["holding_variance"] > 15.0 and metrics["holding_variance"] > metrics["avg_holding_days"]:
            alerts.append(Notification(
                id="ih_warn_1",
                type="inconsistent_holding",
                severity="warning",
                title="Erratic Holding Periods",
                message=f"Your holding periods are highly erratic. Review your exit strategy criteria to ensure consistency.",
                metric_value=f"{metrics['holding_variance']:.1f} variance",
                threshold="> 15.0"
            ))

        # ─── Rule 3: Revenge Trading Indicators ──────────────────────────────
        if len(df) >= 3:
            # Check the most recent trade's context
            last_trade = df.iloc[-1]
            prev_trades = df.iloc[:-1]
            last_two_prev = prev_trades.iloc[-2:]
            
            # If last two were losses
            if len(last_two_prev) == 2 and (last_two_prev["pnl"] < 0).all():
                # Gap between exit of last loss and entry of new trade
                last_loss_exit = last_two_prev.iloc[-1]["sell_date"]
                gap_hours = (last_trade["buy_date"] - last_loss_exit).total_seconds() / 3600
                
                if gap_hours < 1.0:
                    alerts.append(Notification(
                        id="rt_crit_1",
                        type="revenge_trading",
                        severity="critical",
                        title="Revenge Trading Alert",
                        message="You entered a new position shortly after a losing streak. Take a mandatory 1-hour cooling off period.",
                        metric_value=f"{gap_hours*60:.0f} mins",
                        threshold="< 60 mins"
                    ))

        # ─── Rule 4: Loss-Chasing Behavior ───────────────────────────────────
        # Warning: Holding losers longer than winners
        if metrics["avg_holding_losers"] > (2 * metrics["avg_holding_winners"]) and metrics["avg_holding_winners"] > 0:
            alerts.append(Notification(
                id="lc_warn_1",
                type="loss_chasing",
                severity="warning",
                title="Holding Losers Too Long",
                message=f"You are holding losing positions ({metrics['avg_holding_losers']:.1f} days) more than twice as long as winning ones ({metrics['avg_holding_winners']:.1f} days). Cut losses earlier.",
                metric_value=f"{metrics['avg_holding_losers']:.1f}d losers vs {metrics['avg_holding_winners']:.1f}d winners",
                threshold="> 2.0x"
            ))
            
        # Critical: Sizing up after a loss
        if len(df) >= 2:
            last_trade = df.iloc[-1]
            prev_trade = df.iloc[-2]
            
            if prev_trade["pnl"] < 0:
                avg_pos_size = df["buy_value"].mean()
                if last_trade["buy_value"] > (1.5 * avg_pos_size) and last_trade["buy_value"] > prev_trade["buy_value"]:
                    alerts.append(Notification(
                        id="lc_crit_1",
                        type="loss_chasing",
                        severity="critical",
                        title="Risk Sizing Alert",
                        message="Sizing up aggressively immediately after a loss detected. Return to your standard risk unit.",
                        metric_value=f"${last_trade['buy_value']:,.0f}",
                        threshold=f"> ${avg_pos_size * 1.5:,.0f}"
                    ))
                    
        return alerts

