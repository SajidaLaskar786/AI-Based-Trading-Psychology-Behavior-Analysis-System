def get_recommendations(trader_type, top_features=None):
    recommendations = []
    
    # Base recommendations by type
    if trader_type == "Disciplined Trader":
        recommendations = [
            "Maintain current risk management.",
            "Continue following your trading plan.",
            "Review performance periodically."
        ]
    elif trader_type == "Emotional Trader":
        recommendations = [
            "Avoid increasing position size after losses.",
            "Take a cooling-off period after losing trades.",
            "Follow predefined entry and exit rules."
        ]
    elif trader_type == "Aggressive Trader":
        recommendations = [
            "Reduce position size.",
            "Use stricter stop-loss levels.",
            "Avoid excessive leverage."
        ]
    elif trader_type == "Overtrader":
        recommendations = [
            "Reduce trading frequency.",
            "Focus on high-quality setups.",
            "Set a daily trade limit."
        ]
    else:
        recommendations = ["Review and optimize your trading strategy."]

    # Dynamic recommendations based on features
    if top_features:
        features_lower = [f.lower() for f in top_features]
        if any("frequency" in f or "trades_per" in f for f in features_lower) and trader_type != "Overtrader":
            recommendations.append("Monitor your trading frequency to ensure you aren't overtrading.")
        if any("position size" in f for f in features_lower) and trader_type != "Aggressive Trader":
            recommendations.append("Keep a close watch on your position sizing consistency.")
        if any("holding" in f for f in features_lower):
            recommendations.append("Evaluate your holding periods to maximize profit on winning trades.")
            
    return recommendations