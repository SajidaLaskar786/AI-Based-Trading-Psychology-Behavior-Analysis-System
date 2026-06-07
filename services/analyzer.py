"""
Trading Behavior Analysis Engine.
Detects behavioral patterns using statistical heuristics on trade history.
Produces trader profile classification, behavioral risk scores, and feature importance.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass, field


@dataclass
class AnalysisResult:
    """Container for all analysis outputs."""
    # Trader profile
    profile_type: str = ""
    profile_confidence: int = 0
    profile_description: str = ""

    # Behavioral risk scores (0-100)
    risk_scores: Dict[str, int] = field(default_factory=dict)

    # Feature values that influenced predictions
    features: Dict[str, Any] = field(default_factory=dict)

    # Loss analysis data
    loss_causes: List[Dict[str, Any]] = field(default_factory=list)

    # Future risk patterns
    future_risks: List[Dict[str, Any]] = field(default_factory=list)

    # Summary statistics
    summary: Dict[str, Any] = field(default_factory=dict)


class TradingAnalyzer:
    """
    Rule-based behavioral analysis engine.
    Analyzes trade history to detect behavioral patterns and psychological risks.
    """

    # ─── Thresholds ───────────────────────────────────────────────────────

    # Revenge Trading: trades within this many minutes after a loss
    REVENGE_TIME_WINDOW_MINUTES = 15
    # Minimum number of rapid-after-loss trades to flag
    REVENGE_MIN_COUNT = 3

    # Overtrading: daily trade count z-score threshold
    OVERTRADING_ZSCORE_THRESHOLD = 1.5
    # Minimum trades per day to consider overtrading
    OVERTRADING_MIN_DAILY = 5

    # Panic Exit: holding duration percentile threshold (exits below this are "panic")
    PANIC_EXIT_PERCENTILE = 20
    # Minimum positive PnL cut short
    PANIC_PROFIT_CUT_THRESHOLD = 0.5  # ratio of avg win

    # Emotional Trading: coefficient of variation in position sizes
    EMOTIONAL_CV_THRESHOLD = 0.6

    # Overconfidence: position size increase ratio after wins
    OVERCONFIDENCE_SIZE_INCREASE = 1.3

    # FOMO: entry after extended move (price deviation from recent average)
    FOMO_PRICE_DEVIATION = 0.02  # 2%

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self._prepare_data()

    def _prepare_data(self):
        """Pre-compute derived columns needed for analysis."""
        df = self.df

        # Ensure date is datetime
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.sort_values("date").reset_index(drop=True)

        # Calculate trade value
        df["trade_value"] = df["quantity"] * df["price"]

        # Extract date-only for grouping
        if "date" in df.columns:
            df["trade_date"] = df["date"].dt.date

        # Flag winning/losing trades
        if "pnl" in df.columns:
            df["is_win"] = df["pnl"] > 0
            df["is_loss"] = df["pnl"] < 0
        else:
            df["is_win"] = False
            df["is_loss"] = False
            df["pnl"] = 0.0

        # Calculate time between consecutive trades (minutes)
        if "date" in df.columns:
            df["time_diff_minutes"] = df["date"].diff().dt.total_seconds() / 60.0

        # Fill missing holding duration
        if "holding_duration_minutes" not in df.columns:
            df["holding_duration_minutes"] = np.nan

        self.df = df

    # ─── Summary Statistics ───────────────────────────────────────────────

    def compute_summary_stats(self) -> Dict[str, Any]:
        """Compute overall trading summary statistics."""
        df = self.df
        total = len(df)
        wins = int(df["is_win"].sum())
        losses = int(df["is_loss"].sum())
        win_rate = round((wins / total) * 100, 1) if total > 0 else 0.0

        pnl_series = df["pnl"].fillna(0)
        total_pnl = round(float(pnl_series.sum()), 2)
        avg_pnl = round(float(pnl_series.mean()), 2) if total > 0 else 0.0

        # Consecutive losses/wins
        max_consec_losses = self._max_consecutive(df["is_loss"])
        max_consec_wins = self._max_consecutive(df["is_win"])

        # Largest win/loss
        largest_win = round(float(pnl_series.max()), 2) if total > 0 else 0.0
        largest_loss = round(float(pnl_series.min()), 2) if total > 0 else 0.0

        # Profit factor
        gross_profit = float(pnl_series[pnl_series > 0].sum())
        gross_loss = abs(float(pnl_series[pnl_series < 0].sum()))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else None

        # Average holding duration
        avg_hold = None
        if "holding_duration_minutes" in df.columns:
            valid_durations = df["holding_duration_minutes"].dropna()
            if len(valid_durations) > 0:
                avg_hold = round(float(valid_durations.mean()), 1)

        return {
            "total_trades": total,
            "winning_trades": wins,
            "losing_trades": losses,
            "win_rate": win_rate,
            "total_pnl": total_pnl,
            "average_pnl_per_trade": avg_pnl,
            "avg_holding_duration_minutes": avg_hold,
            "max_consecutive_losses": max_consec_losses,
            "max_consecutive_wins": max_consec_wins,
            "largest_win": largest_win,
            "largest_loss": largest_loss,
            "profit_factor": profit_factor,
        }

    @staticmethod
    def _max_consecutive(bool_series: pd.Series) -> int:
        """Calculate maximum consecutive True values in a boolean series."""
        if bool_series.empty:
            return 0
        groups = bool_series.ne(bool_series.shift()).cumsum()
        counts = bool_series.groupby(groups).sum()
        return int(counts.max()) if len(counts) > 0 else 0

    # ─── Behavioral Risk Detection ───────────────────────────────────────

    def detect_revenge_trading(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect revenge trading: rapid trades placed shortly after losses.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df
        if "time_diff_minutes" not in df.columns or df["pnl"].isna().all():
            return 0, {"revenge_trade_count": 0, "avg_time_after_loss": "N/A"}

        revenge_count = 0
        revenge_pnl = 0.0
        times_after_loss = []

        for i in range(1, len(df)):
            # Previous trade was a loss
            if df.iloc[i - 1]["is_loss"]:
                time_gap = df.iloc[i].get("time_diff_minutes", float("inf"))
                if pd.notna(time_gap) and time_gap <= self.REVENGE_TIME_WINDOW_MINUTES:
                    revenge_count += 1
                    revenge_pnl += df.iloc[i].get("pnl", 0) or 0
                    times_after_loss.append(time_gap)

        total_trades = len(df)
        revenge_ratio = revenge_count / total_trades if total_trades > 0 else 0

        # Score: combine ratio and count
        score = min(100, int(revenge_ratio * 200 + (revenge_count >= self.REVENGE_MIN_COUNT) * 20))

        avg_time = round(np.mean(times_after_loss), 1) if times_after_loss else None

        features = {
            "revenge_trade_count": revenge_count,
            "revenge_trade_ratio": round(revenge_ratio, 3),
            "avg_time_after_loss_minutes": avg_time,
            "revenge_total_pnl": round(revenge_pnl, 2),
            "time_window_threshold": f"{self.REVENGE_TIME_WINDOW_MINUTES} min",
        }

        return score, features

    def detect_overtrading(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect overtrading: excessive number of trades per session.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df
        if "trade_date" not in df.columns:
            return 0, {"avg_daily_trades": 0}

        daily_counts = df.groupby("trade_date").size()
        avg_daily = float(daily_counts.mean()) if len(daily_counts) > 0 else 0
        std_daily = float(daily_counts.std()) if len(daily_counts) > 1 else 0
        max_daily = int(daily_counts.max()) if len(daily_counts) > 0 else 0

        # Count days where trading was excessive
        overtrading_days = 0
        if std_daily > 0:
            z_scores = (daily_counts - avg_daily) / std_daily
            overtrading_days = int((z_scores > self.OVERTRADING_ZSCORE_THRESHOLD).sum())

        total_days = len(daily_counts)
        overtrading_ratio = overtrading_days / total_days if total_days > 0 else 0

        # Score
        score = min(100, int(
            overtrading_ratio * 100 +
            (avg_daily > self.OVERTRADING_MIN_DAILY) * 15 +
            (max_daily > avg_daily * 2) * 20
        ))

        features = {
            "avg_daily_trades": round(avg_daily, 1),
            "max_daily_trades": max_daily,
            "overtrading_days": overtrading_days,
            "total_trading_days": total_days,
            "overtrading_day_ratio": round(overtrading_ratio, 3),
        }

        return score, features

    def detect_panic_exit(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect panic exits: cutting winning trades too short or
        exiting positions too quickly.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df
        panic_count = 0
        early_exit_count = 0

        # Check holding duration based panic
        if "holding_duration_minutes" in df.columns:
            valid = df["holding_duration_minutes"].dropna()
            if len(valid) > 5:
                threshold = valid.quantile(self.PANIC_EXIT_PERCENTILE / 100.0)
                short_holds = df[df["holding_duration_minutes"] < threshold]
                # Short holds that were losing trades = panic exit
                panic_exits = short_holds[short_holds["is_loss"]]
                panic_count = len(panic_exits)

        # Check for cutting winners short: wins that are much smaller than average
        if "pnl" in df.columns:
            wins = df[df["is_win"]]
            if len(wins) > 3:
                avg_win = wins["pnl"].mean()
                small_wins = wins[wins["pnl"] < avg_win * self.PANIC_PROFIT_CUT_THRESHOLD]
                early_exit_count = len(small_wins)

        total = len(df)
        panic_ratio = (panic_count + early_exit_count) / total if total > 0 else 0

        score = min(100, int(panic_ratio * 150))

        features = {
            "panic_exit_count": panic_count,
            "early_profit_cut_count": early_exit_count,
            "panic_ratio": round(panic_ratio, 3),
            "total_flagged": panic_count + early_exit_count,
        }

        return score, features

    def detect_emotional_trading(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect emotional trading: high variance in position sizing
        and inconsistent behavior.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df

        # Coefficient of variation of position sizes
        sizes = df["trade_value"].dropna()
        if len(sizes) < 3:
            return 0, {"position_size_cv": 0}

        mean_size = sizes.mean()
        std_size = sizes.std()
        cv = std_size / mean_size if mean_size > 0 else 0

        # Check for size increases after losses
        size_after_loss_increase = 0
        for i in range(1, len(df)):
            if df.iloc[i - 1]["is_loss"]:
                if df.iloc[i]["trade_value"] > df.iloc[i - 1]["trade_value"] * 1.2:
                    size_after_loss_increase += 1

        total = len(df)
        emotional_ratio = size_after_loss_increase / total if total > 0 else 0

        # Score: combine CV and post-loss behavior
        score = min(100, int(
            (cv > self.EMOTIONAL_CV_THRESHOLD) * 30 +
            cv * 40 +
            emotional_ratio * 100
        ))

        features = {
            "position_size_cv": round(cv, 3),
            "cv_threshold": self.EMOTIONAL_CV_THRESHOLD,
            "size_increase_after_loss_count": size_after_loss_increase,
            "avg_position_size": round(float(mean_size), 2),
            "std_position_size": round(float(std_size), 2),
        }

        return score, features

    def detect_overconfidence(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect overconfidence: increasing position sizes after winning streaks.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df
        if len(df) < 5:
            return 0, {"size_increase_after_wins": 0}

        size_increases_after_wins = 0
        win_streak_trades = 0
        max_streak_size_ratio = 0.0

        consecutive_wins = 0
        for i in range(1, len(df)):
            if df.iloc[i - 1]["is_win"]:
                consecutive_wins += 1
            else:
                consecutive_wins = 0

            if consecutive_wins >= 2:
                prev_value = df.iloc[i - 1]["trade_value"]
                curr_value = df.iloc[i]["trade_value"]
                if prev_value > 0:
                    ratio = curr_value / prev_value
                    if ratio > self.OVERCONFIDENCE_SIZE_INCREASE:
                        size_increases_after_wins += 1
                        max_streak_size_ratio = max(max_streak_size_ratio, ratio)
                win_streak_trades += 1

        total = len(df)
        overconf_ratio = size_increases_after_wins / total if total > 0 else 0

        score = min(100, int(overconf_ratio * 200 + (max_streak_size_ratio > 1.5) * 25))

        features = {
            "size_increase_after_wins": size_increases_after_wins,
            "win_streak_trades": win_streak_trades,
            "max_size_increase_ratio": round(max_streak_size_ratio, 2),
            "overconfidence_ratio": round(overconf_ratio, 3),
        }

        return score, features

    def detect_fomo(self) -> Tuple[int, Dict[str, Any]]:
        """
        Detect FOMO (Fear of Missing Out): entering trades at unfavorable prices.

        Returns:
            Tuple of (risk_score 0-100, feature_data dict)
        """
        df = self.df
        if len(df) < 10:
            return 0, {"fomo_entries": 0}

        fomo_entries = 0
        fomo_losses = 0.0

        # Group by symbol and check for entries at price extremes
        for symbol in df["symbol"].unique():
            sym_df = df[df["symbol"] == symbol].sort_values("date")
            if len(sym_df) < 3:
                continue

            # Rolling average price for this symbol
            sym_df = sym_df.copy()
            sym_df["price_ma"] = sym_df["price"].rolling(window=min(5, len(sym_df)), min_periods=1).mean()

            buys = sym_df[sym_df["action"] == "buy"]
            for _, trade in buys.iterrows():
                if trade["price_ma"] > 0:
                    deviation = (trade["price"] - trade["price_ma"]) / trade["price_ma"]
                    if deviation > self.FOMO_PRICE_DEVIATION:
                        fomo_entries += 1
                        if pd.notna(trade.get("pnl")) and trade["pnl"] < 0:
                            fomo_losses += trade["pnl"]

        total_buys = len(df[df["action"] == "buy"])
        fomo_ratio = fomo_entries / total_buys if total_buys > 0 else 0

        score = min(100, int(fomo_ratio * 150))

        features = {
            "fomo_entries": fomo_entries,
            "fomo_ratio": round(fomo_ratio, 3),
            "fomo_total_loss": round(fomo_losses, 2),
            "price_deviation_threshold": f"{self.FOMO_PRICE_DEVIATION * 100}%",
        }

        return score, features

    # ─── Profile Classification ──────────────────────────────────────────

    def classify_trader_profile(self, risk_scores: Dict[str, int]) -> Tuple[str, int, str]:
        """
        Classify the trader into a personality profile based on risk scores.

        Returns:
            Tuple of (profile_type, confidence_score, description)
        """
        profiles = {
            "Emotional Trader": {
                "weights": {"revenge_trading": 0.3, "emotional_trading": 0.35, "panic_exit": 0.2, "overtrading": 0.15},
                "description": "Your trading is significantly influenced by emotional reactions. You tend to make impulsive decisions after losses and show high variability in position sizing, indicating that feelings rather than strategy drive many of your trades."
            },
            "Impulsive Trader": {
                "weights": {"overtrading": 0.35, "revenge_trading": 0.25, "fomo": 0.25, "emotional_trading": 0.15},
                "description": "You exhibit a pattern of acting quickly without thorough analysis. Frequent trading, chasing moves, and reacting to losses with immediate new positions suggest impulsivity drives your decision-making."
            },
            "Overconfident Trader": {
                "weights": {"overconfidence": 0.4, "overtrading": 0.2, "fomo": 0.2, "emotional_trading": 0.2},
                "description": "After winning trades, you tend to increase risk significantly. This pattern of escalating position sizes following success suggests overconfidence bias, which often leads to outsized losses when the streak ends."
            },
            "Risk-Averse Trader": {
                "weights": {"panic_exit": 0.4, "emotional_trading": 0.25, "fomo": -0.15, "overtrading": -0.1},
                "description": "You frequently exit positions too early, cutting profits short due to fear. While this limits downside, it also severely caps upside potential. Your trading shows a pattern of prioritizing loss avoidance over gain optimization."
            },
            "Disciplined Trader": {
                "weights": {"revenge_trading": -0.2, "overtrading": -0.2, "panic_exit": -0.2, "emotional_trading": -0.2, "overconfidence": -0.1, "fomo": -0.1},
                "description": "Your trading shows consistent position sizing, measured timing between trades, and relatively low emotional reactivity. You demonstrate good discipline in following a strategy without letting emotions dictate decisions."
            },
        }

        best_profile = "Emotional Trader"
        best_score = -999

        for profile, config in profiles.items():
            score = 0
            for risk_name, weight in config["weights"].items():
                risk_value = risk_scores.get(risk_name, 0)
                if weight < 0:
                    score += weight * (100 - risk_value)
                else:
                    score += weight * risk_value
            if score > best_score:
                best_score = score
                best_profile = profile

        # Confidence: how well the data fits the profile (normalize to 0-100)
        max_possible = sum(abs(w) * 100 for w in profiles[best_profile]["weights"].values())
        confidence = min(100, max(30, int((best_score / max_possible) * 100))) if max_possible > 0 else 50

        return best_profile, confidence, profiles[best_profile]["description"]

    # ─── Loss Analysis ───────────────────────────────────────────────────

    def analyze_losses(self, risk_features: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze the behavioral causes of losses."""
        df = self.df
        losses = df[df["is_loss"]]
        total_loss = abs(float(losses["pnl"].sum())) if len(losses) > 0 else 0

        causes = []

        # Revenge trading losses
        revenge_data = risk_features.get("revenge_trading", {})
        revenge_pnl = abs(revenge_data.get("revenge_total_pnl", 0))
        if revenge_pnl > 0:
            causes.append({
                "cause": "Revenge Trading",
                "description": f"Trading too quickly after losses led to {revenge_data.get('revenge_trade_count', 0)} impulsive trades. These trades were entered within {self.REVENGE_TIME_WINDOW_MINUTES} minutes of a losing trade, often without proper analysis.",
                "affected_trades": revenge_data.get("revenge_trade_count", 0),
                "total_loss": round(-revenge_pnl, 2),
                "percentage_of_total_loss": round((revenge_pnl / total_loss) * 100, 1) if total_loss > 0 else 0,
            })

        # Emotional position sizing losses
        emotional_data = risk_features.get("emotional_trading", {})
        size_increase_count = emotional_data.get("size_increase_after_loss_count", 0)
        if size_increase_count > 0:
            # Estimate loss from increased positions after losses
            estimated_loss = total_loss * 0.3  # heuristic
            causes.append({
                "cause": "Emotional Position Sizing",
                "description": f"Position sizes increased after {size_increase_count} losing trades, indicating emotional decision-making. Coefficient of variation in position sizes was {emotional_data.get('position_size_cv', 0)}, exceeding the healthy threshold of {self.EMOTIONAL_CV_THRESHOLD}.",
                "affected_trades": size_increase_count,
                "total_loss": round(-estimated_loss, 2),
                "percentage_of_total_loss": round((estimated_loss / total_loss) * 100, 1) if total_loss > 0 else 0,
            })

        # FOMO losses
        fomo_data = risk_features.get("fomo", {})
        fomo_loss = abs(fomo_data.get("fomo_total_loss", 0))
        if fomo_loss > 0:
            causes.append({
                "cause": "FOMO (Fear of Missing Out)",
                "description": f"Entered {fomo_data.get('fomo_entries', 0)} trades at prices significantly above recent averages, chasing moves rather than waiting for favorable entries.",
                "affected_trades": fomo_data.get("fomo_entries", 0),
                "total_loss": round(-fomo_loss, 2),
                "percentage_of_total_loss": round((fomo_loss / total_loss) * 100, 1) if total_loss > 0 else 0,
            })

        # Panic exit losses (opportunity cost)
        panic_data = risk_features.get("panic_exit", {})
        panic_count = panic_data.get("panic_exit_count", 0) + panic_data.get("early_profit_cut_count", 0)
        if panic_count > 0:
            causes.append({
                "cause": "Panic Exits & Premature Profit Taking",
                "description": f"Exited {panic_count} positions prematurely — either cutting losses too quickly or taking profits far below average win size. This behavior erodes edge over time.",
                "affected_trades": panic_count,
                "total_loss": round(-total_loss * 0.15, 2),
                "percentage_of_total_loss": 15.0,
            })

        # If no specific causes found, add general analysis
        if not causes and total_loss > 0:
            causes.append({
                "cause": "General Market Risk",
                "description": "Losses appear to be primarily market-driven rather than behavioral. No strong behavioral patterns were detected in the losing trades.",
                "affected_trades": len(losses),
                "total_loss": round(-total_loss, 2),
                "percentage_of_total_loss": 100.0,
            })

        return causes

    # ─── Future Risk Prediction ──────────────────────────────────────────

    def predict_future_risks(
        self, risk_scores: Dict[str, int], risk_features: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Predict behavioral patterns likely to repeat."""
        df = self.df
        future_risks = []

        # Check for worsening trends in the second half of data
        midpoint = len(df) // 2
        if midpoint < 5:
            # Not enough data for trend analysis
            for risk_name, score in risk_scores.items():
                if score >= 50:
                    future_risks.append({
                        "pattern": f"{risk_name.replace('_', ' ').title()} continuation",
                        "likelihood": "high" if score >= 70 else "medium",
                        "recommendation": self._get_recommendation(risk_name),
                        "supporting_evidence": f"Current score of {score}% indicates established behavioral pattern.",
                    })
            return future_risks

        first_half = df.iloc[:midpoint]
        second_half = df.iloc[midpoint:]

        # Revenge trading trend
        if risk_scores.get("revenge_trading", 0) >= 30:
            first_revenge = self._count_revenge_trades(first_half)
            second_revenge = self._count_revenge_trades(second_half)
            trend = "worsening" if second_revenge > first_revenge else "stable"
            likelihood = "high" if trend == "worsening" else "medium"

            future_risks.append({
                "pattern": "Revenge Trading after consecutive losses",
                "likelihood": likelihood,
                "recommendation": "Implement a mandatory 30-minute cooling-off period after any losing trade. Consider setting a daily loss limit that triggers an automatic trading halt.",
                "supporting_evidence": f"Revenge trades: {first_revenge} (first half) → {second_revenge} (second half). Trend: {trend}.",
            })

        # Overtrading trend
        if risk_scores.get("overtrading", 0) >= 30:
            future_risks.append({
                "pattern": "Overtrading during high-volatility sessions",
                "likelihood": "high" if risk_scores["overtrading"] >= 60 else "medium",
                "recommendation": "Set a maximum daily trade count (e.g., 5-8 trades). Review each trade against your checklist before entry. Quality over quantity.",
                "supporting_evidence": f"Average daily trades: {risk_features.get('overtrading', {}).get('avg_daily_trades', 'N/A')}. Overtrading detected on {risk_features.get('overtrading', {}).get('overtrading_days', 0)} days.",
            })

        # Emotional escalation
        if risk_scores.get("emotional_trading", 0) >= 40:
            future_risks.append({
                "pattern": "Emotional escalation during drawdowns",
                "likelihood": "high" if risk_scores["emotional_trading"] >= 65 else "medium",
                "recommendation": "Use fixed position sizing rules (e.g., risk max 1-2% per trade). Pre-define entry/exit levels before each trade and do not deviate.",
                "supporting_evidence": f"Position size CV: {risk_features.get('emotional_trading', {}).get('position_size_cv', 'N/A')}. Size increases after losses: {risk_features.get('emotional_trading', {}).get('size_increase_after_loss_count', 0)}.",
            })

        # Panic exit tendency
        if risk_scores.get("panic_exit", 0) >= 25:
            future_risks.append({
                "pattern": "Premature exits on profitable positions",
                "likelihood": "medium",
                "recommendation": "Use trailing stops instead of manual exits. Set minimum hold durations for trades and avoid watching positions tick-by-tick.",
                "supporting_evidence": f"Flagged {risk_features.get('panic_exit', {}).get('total_flagged', 0)} premature exits out of total trades.",
            })

        # Overconfidence after wins
        if risk_scores.get("overconfidence", 0) >= 30:
            future_risks.append({
                "pattern": "Position size escalation after winning streaks",
                "likelihood": "high" if risk_scores["overconfidence"] >= 60 else "medium",
                "recommendation": "Maintain consistent position sizing regardless of recent results. Consider reducing size slightly after a winning streak to counter the natural urge to increase.",
                "supporting_evidence": f"Detected {risk_features.get('overconfidence', {}).get('size_increase_after_wins', 0)} instances of size increases following wins.",
            })

        return future_risks

    def _count_revenge_trades(self, df_subset: pd.DataFrame) -> int:
        """Count revenge trades in a subset of data."""
        count = 0
        for i in range(1, len(df_subset)):
            if df_subset.iloc[i - 1]["is_loss"]:
                time_gap = df_subset.iloc[i].get("time_diff_minutes", float("inf"))
                if pd.notna(time_gap) and time_gap <= self.REVENGE_TIME_WINDOW_MINUTES:
                    count += 1
        return count

    @staticmethod
    def _get_recommendation(risk_name: str) -> str:
        """Get a recommendation for a specific risk type."""
        recommendations = {
            "revenge_trading": "Implement cooling-off periods after losses. Set daily loss limits.",
            "overtrading": "Set maximum daily trade counts. Focus on quality setups only.",
            "panic_exit": "Use trailing stops. Set minimum hold durations.",
            "emotional_trading": "Use fixed position sizing. Pre-plan all trades.",
            "overconfidence": "Maintain consistent position sizes regardless of recent results.",
            "fomo": "Wait for pullbacks. Only enter at pre-defined levels.",
        }
        return recommendations.get(risk_name, "Review and improve trading discipline.")

    # ─── Main Analysis Pipeline ──────────────────────────────────────────

    def run_full_analysis(self) -> AnalysisResult:
        """Run the complete analysis pipeline and return results."""
        result = AnalysisResult()

        # 1. Summary statistics
        result.summary = self.compute_summary_stats()

        # 2. Detect all behavioral risks
        detectors = {
            "revenge_trading": self.detect_revenge_trading,
            "overtrading": self.detect_overtrading,
            "panic_exit": self.detect_panic_exit,
            "emotional_trading": self.detect_emotional_trading,
            "overconfidence": self.detect_overconfidence,
            "fomo": self.detect_fomo,
        }

        risk_features = {}
        for risk_name, detector_fn in detectors.items():
            score, features = detector_fn()
            result.risk_scores[risk_name] = score
            risk_features[risk_name] = features

        result.features = risk_features

        # 3. Classify trader profile
        profile_type, confidence, description = self.classify_trader_profile(result.risk_scores)
        result.profile_type = profile_type
        result.profile_confidence = confidence
        result.profile_description = description

        # 4. Loss analysis
        result.loss_causes = self.analyze_losses(risk_features)

        # 5. Future risk prediction
        result.future_risks = self.predict_future_risks(result.risk_scores, risk_features)

        return result
