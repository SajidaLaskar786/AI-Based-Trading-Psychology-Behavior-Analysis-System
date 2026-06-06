def generate_analysis(
    trader_type,
    top_features
):

    if trader_type == "Emotional Trader":
        return (
            "The trader shows signs of reacting "
            "emotionally after losses and tends "
            "to trade impulsively."
        )

    elif trader_type == "Overtrader":
        return (
            "The trader executes trades too "
            "frequently and may be forcing setups."
        )

    elif trader_type == "Aggressive Trader":
        return (
            "The trader takes larger risks than "
            "average and uses larger position sizes."
        )

    elif trader_type == "Disciplined Trader":
        return (
            "The trader demonstrates stable "
            "risk management and controlled trading."
        )

    return "Analysis unavailable."