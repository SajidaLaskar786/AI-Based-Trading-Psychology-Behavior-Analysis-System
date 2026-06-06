import pandas as pd
import numpy as np
import os


# ==========================================
# Helper Functions
# ==========================================

def max_loss_streak(pnl_series):

    max_streak = 0
    current = 0

    for pnl in pnl_series:

        if pnl < 0:
            current += 1
            max_streak = max(max_streak, current)

        else:
            current = 0

    return max_streak


def max_win_streak(pnl_series):

    max_streak = 0
    current = 0

    for pnl in pnl_series:

        if pnl > 0:
            current += 1
            max_streak = max(max_streak, current)

        else:
            current = 0

    return max_streak


# ==========================================
# Main Feature Engineering Function
# ==========================================

def generate_features(df):

    df = df.copy()

    df["buy_date"] = pd.to_datetime(
        df["buy_date"]
    )

    df["sell_date"] = pd.to_datetime(
        df["sell_date"]
    )

    # Holding Days
    df["holding_days"] = (
        df["sell_date"] - df["buy_date"]
    ).dt.days

    # Return %
    df["return_pct"] = (
        (df["sell_value"] - df["buy_value"])
        / df["buy_value"]
    ) * 100

    df = df.sort_values(
        ["trader_id", "buy_date"]
    )

    features = []

    for trader_id, group in df.groupby(
        "trader_id"
    ):

        group = (
            group
            .sort_values("buy_date")
            .reset_index(drop=True)
        )

        total_trades = len(group)

        wins = group[
            group["pnl"] > 0
        ]

        losses = group[
            group["pnl"] < 0
        ]

        # =====================================
        # Performance Features
        # =====================================

        win_rate = (
            len(wins)
            / total_trades
        )

        avg_profit = (
            wins["pnl"].mean()
            if len(wins) > 0
            else 0
        )

        avg_loss = (
            abs(losses["pnl"].mean())
            if len(losses) > 0
            else 0
        )

        total_profit = (
            wins["pnl"].sum()
        )

        total_loss = abs(
            losses["pnl"].sum()
        )

        profit_factor = (
            total_profit
            / total_loss
            if total_loss > 0
            else 0
        )

        avg_return_pct = (
            group["return_pct"].mean()
        )

        # =====================================
        # Trading Behaviour
        # =====================================

        avg_holding_days = (
            group["holding_days"].mean()
        )

        holding_variance = (
            group["holding_days"].std()
        )

        active_months = max(
            1,
            (
                group["buy_date"].max()
                - group["buy_date"].min()
            ).days / 30
        )

        trades_per_month = (
            total_trades
            / active_months
        )

        active_days = max(
            1,
            (
                group["buy_date"].max()
                - group["buy_date"].min()
            ).days
        )

        avg_trades_per_day = (
            total_trades
            / active_days
        )

        max_loss = max_loss_streak(
            group["pnl"]
        )

        max_win = max_win_streak(
            group["pnl"]
        )

        # =====================================
        # Risk Features
        # =====================================

        avg_position_size = (
            group["buy_value"].mean()
        )

        position_size_variance = (
            group["buy_value"].std()
        )

        pnl_std = (
            group["pnl"].std()
        )

        first_half = group.iloc[
            : len(group) // 2
        ]

        second_half = group.iloc[
            len(group) // 2 :
        ]

        risk_escalation_ratio = (
            second_half["buy_value"].mean()
            / first_half["buy_value"].mean()
            if len(first_half) > 0
            else 1
        )

        # =====================================
        # Psychology Features
        # =====================================

        post_loss_changes = []

        post_loss_delays = []

        for i in range(
            len(group) - 1
        ):

            current_trade = group.iloc[i]

            next_trade = group.iloc[
                i + 1
            ]

            if current_trade["pnl"] < 0:

                change = (
                    next_trade["buy_value"]
                    - current_trade["buy_value"]
                )

                post_loss_changes.append(
                    change
                )

                delay = max(
                    0,
                    (
                        next_trade["buy_date"]
                        - current_trade["sell_date"]
                    ).days
                )

                post_loss_delays.append(
                    delay
                )

        post_loss_position_change = (
            np.mean(post_loss_changes)
            if len(post_loss_changes) > 0
            else 0
        )

        post_loss_trade_delay = (
            np.mean(post_loss_delays)
            if len(post_loss_delays) > 0
            else 0
        )

        # =====================================
        # Overtrading Features
        # =====================================

        trade_gaps = []

        for i in range(
            len(group) - 1
        ):

            gap = (
                group.iloc[i + 1]["buy_date"]
                - group.iloc[i]["buy_date"]
            ).days

            trade_gaps.append(gap)

        avg_gap_between_trades = (
            np.mean(trade_gaps)
            if len(trade_gaps) > 0
            else 0
        )

        same_day_trades = sum(
            1
            for gap in trade_gaps
            if gap == 0
        )

        same_day_trade_ratio = (
            same_day_trades
            / len(trade_gaps)
            if len(trade_gaps) > 0
            else 0
        )

        # =====================================
        # Save Features
        # =====================================

        features.append({

            "trader_id":
                trader_id,

            "win_rate":
                win_rate,

            "avg_profit":
                avg_profit,

            "avg_loss":
                avg_loss,

            "profit_factor":
                profit_factor,

            "avg_return_pct":
                avg_return_pct,

            "avg_holding_days":
                avg_holding_days,

            "holding_variance":
                holding_variance,

            "trades_per_month":
                trades_per_month,

            "avg_trades_per_day":
                avg_trades_per_day,

            "max_loss_streak":
                max_loss,

            "max_win_streak":
                max_win,

            "avg_position_size":
                avg_position_size,

            "position_size_variance":
                position_size_variance,

            "risk_escalation_ratio":
                risk_escalation_ratio,

            "pnl_std":
                pnl_std,

            "post_loss_position_change":
                post_loss_position_change,

            "post_loss_trade_delay":
                post_loss_trade_delay,

            "avg_gap_between_trades":
                avg_gap_between_trades,

            "same_day_trade_ratio":
                same_day_trade_ratio
        })

    features_df = pd.DataFrame(
        features
    )

    return features_df


# ==========================================
# Standalone Execution
# ==========================================

if __name__ == "__main__":

    raw_df = pd.read_csv(
        "data/raw/synthetic_trading_data.csv"
    )

    features_df = generate_features(
        raw_df
    )

    os.makedirs(
        "data/processed",
        exist_ok=True
    )

    features_df.to_csv(
        "data/processed/trader_features.csv",
        index=False
    )

    print(
        "\nFeature Engineering Completed"
    )

    print(
        "Shape:",
        features_df.shape
    )

    print(
        features_df.head()
    )