def generate_analysis(trader_type, top_features):
    base_analysis = {
        "Emotional Trader": "The trader shows signs of reacting emotionally after losses and tends to trade impulsively.",
        "Overtrader": "The trader executes trades too frequently and may be forcing setups.",
        "Aggressive Trader": "The trader takes larger risks than average and uses larger position sizes.",
        "Disciplined Trader": "The trader demonstrates stable risk management and controlled trading."
    }
    
    analysis_text = base_analysis.get(trader_type, f"The trader exhibits a {trader_type} profile.")
    
    if top_features:
        features_str = ", ".join([f.lower() for f in top_features[:3]])
        analysis_text += f"\n\nThis behavior is strongly influenced by specific patterns, primarily their {features_str}."
        
    return analysis_text