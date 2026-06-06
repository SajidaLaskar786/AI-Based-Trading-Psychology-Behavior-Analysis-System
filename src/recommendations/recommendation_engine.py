def get_recommendations(trader_type):

    recommendations = {
        "Disciplined Trader": [
            "Maintain current risk management.",
            "Continue following your trading plan.",
            "Review performance periodically."
        ],

        "Emotional Trader": [
            "Avoid increasing position size after losses.",
            "Take a cooling-off period after losing trades.",
            "Follow predefined entry and exit rules."
        ],

        "Aggressive Trader": [
            "Reduce position size.",
            "Use stricter stop-loss levels.",
            "Avoid excessive leverage."
        ],

        "Overtrader": [
            "Reduce trading frequency.",
            "Focus on high-quality setups.",
            "Set a daily trade limit."
        ]
    }

    return recommendations.get(
        trader_type,
        ["No recommendation available."]
    )