def generate_reasons(row):

    reasons = []

    if row["post_loss_position_change"] > 3000:
        reasons.append(
            "Position size increases after losses"
        )

    if row["same_day_trade_ratio"] > 0.20:
        reasons.append(
            "Frequent same-day trading detected"
        )

    if row["trades_per_month"] > 20:
        reasons.append(
            "Excessive trading frequency"
        )

    if row["max_loss_streak"] > 5:
        reasons.append(
            "Large losing streaks observed"
        )

    return reasons

def calculate_risk(row):

    risk = 0

    if row["post_loss_position_change"] > 3000:
        risk += 30

    if row["same_day_trade_ratio"] > 0.20:
        risk += 20

    if row["trades_per_month"] > 20:
        risk += 25

    if row["max_loss_streak"] > 5:
        risk += 25

    return min(risk, 100)

def generate_suggestions(row):

    suggestions = []

    if row["post_loss_position_change"] > 3000:
        suggestions.append(
            "Reduce position size after losses"
        )

    if row["same_day_trade_ratio"] > 0.20:
        suggestions.append(
            "Avoid immediate re-entry after exits"
        )

    if row["trades_per_month"] > 20:
        suggestions.append(
            "Limit number of trades per day"
        )

    return suggestions

