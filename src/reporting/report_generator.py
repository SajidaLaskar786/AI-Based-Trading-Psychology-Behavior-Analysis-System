import sys
import os

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

from explainability.shap_explainer import explain_trader
from analysis.behavior_analysis import generate_analysis
from recommendations.recommendation_engine import get_recommendations


def generate_report(trader_index=0):

    # SHAP + Random Forest
    trader_type, top_features = explain_trader(
        trader_index
    )

    # Analysis
    analysis = generate_analysis(
        trader_type,
        top_features
    )

    # Recommendations
    recommendations = get_recommendations(
        trader_type,
        top_features
    )

    print("\n" + "=" * 50)
    print("TRADER PSYCHOLOGY REPORT")
    print("=" * 50)

    print(f"\nTrader ID: {trader_index + 1}")

    print(f"\nTrader Type:")
    print(trader_type)

    print(f"\nBehavior Analysis:")
    print(analysis)

    print("\nTop Behavioral Drivers:")

    for i, feature in enumerate(
        top_features,
        start=1
    ):
        print(f"{i}. {feature}")

    print("\nRecommendations:")

    for recommendation in recommendations:
        print(f"• {recommendation}")

    print("\n" + "=" * 50)


if __name__ == "__main__":
    generate_report(0)