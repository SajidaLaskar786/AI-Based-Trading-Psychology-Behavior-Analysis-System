import joblib
import pandas as pd
import shap
import numpy as np


# Load trained model
model = joblib.load(
    "models/random_forest.pkl"
)

# Load feature dataset
df = pd.read_csv(
    "data/processed/trader_features.csv"
)

# Remove trader_id
X = df.drop(
    columns=["trader_id"]
)

# Create SHAP explainer
explainer = shap.TreeExplainer(model)

# Calculate SHAP values
shap_values = explainer.shap_values(X)


def explain_trader(trader_index=0):

    # Predict trader type
    prediction = model.predict(
        X.iloc[[trader_index]]
    )[0]

    # Get class index
    class_index = list(
        model.classes_
    ).index(prediction)

    # SHAP values for this trader
    values = np.abs(
        shap_values[
            trader_index,
            :,
            class_index
        ]
    )

    # Feature importance table
    feature_importance = pd.DataFrame({
        "feature": X.columns,
        "importance": values
    })

    feature_importance = (
        feature_importance
        .sort_values(
            by="importance",
            ascending=False
        )
    )

    # Top 5 features
    top_features = (
        feature_importance
        .head(5)["feature"]
        .tolist()
    )

    # Human-readable names
    feature_names = {
        "win_rate":
            "Win Rate",

        "avg_profit":
            "Average Profit",

        "avg_loss":
            "Average Loss",

        "profit_factor":
            "Profit Factor",

        "avg_return_pct":
            "Average Return Percentage",

        "avg_holding_days":
            "Average Holding Period",

        "holding_variance":
            "Holding Consistency",

        "trades_per_month":
            "Trading Frequency",

        "avg_trades_per_day":
            "Daily Trading Activity",

        "max_loss_streak":
            "Maximum Loss Streak",

        "max_win_streak":
            "Maximum Win Streak",

        "avg_position_size":
            "Average Position Size",

        "position_size_variance":
            "Position Size Consistency",

        "risk_escalation_ratio":
            "Risk Escalation",

        "pnl_std":
            "Profit/Loss Volatility",

        "post_loss_position_change":
            "Position Size Change After Loss",

        "post_loss_trade_delay":
            "Delay After Losing Trade",

        "avg_gap_between_trades":
            "Time Between Trades",

        "same_day_trade_ratio":
            "Same Day Trading Ratio"
    }

    top_features = [
        feature_names.get(
            feature,
            feature
        )
        for feature in top_features
    ]

    return (
        prediction,
        top_features
    )


# Test
if __name__ == "__main__":

    prediction, top_features = explain_trader(
        trader_index=0
    )

    print("\n=====================================")
    print("SHAP EXPLANATION")
    print("=====================================")

    print("\nTrader Type:")
    print(prediction)

    print("\nTop 5 Behavioral Drivers:")

    for i, feature in enumerate(
        top_features,
        start=1
    ):
        print(
            f"{i}. {feature}"
        )

    print("\n=====================================")