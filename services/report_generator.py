"""
Report Generator Service.
Converts raw analysis results into the structured API response format.
"""

from models.schemas import (
    AnalysisReport,
    TraderProfile,
    BehavioralRisk,
    FeatureImportance,
    LossCause,
    FutureRisk,
    SummaryStats,
)
from services.analyzer import AnalysisResult
from typing import List


# Display names and descriptions for behavioral risks
RISK_DISPLAY_INFO = {
    "revenge_trading": {
        "name": "Revenge Trading",
        "description_template": "Detected {count} instances of trades placed within {window} of a losing trade. This pattern suggests emotional retaliation against the market after losses, leading to poorly planned entries.",
    },
    "overtrading": {
        "name": "Overtrading",
        "description_template": "Average of {avg} trades per day with {days} days exceeding normal activity levels. Excessive trading erodes profits through transaction costs and reduces decision quality.",
    },
    "panic_exit": {
        "name": "Panic Exit",
        "description_template": "Identified {count} premature exits — positions closed too early due to fear. This includes both panic stops on losing trades and cutting winners far below average profit.",
    },
    "emotional_trading": {
        "name": "Emotional Trading",
        "description_template": "Position sizing coefficient of variation is {cv}, indicating inconsistent sizing driven by emotional state rather than systematic risk management.",
    },
    "overconfidence": {
        "name": "Overconfidence",
        "description_template": "Detected {count} instances of position size escalation after winning streaks. Maximum size increase ratio of {ratio}x suggests growing overconfidence.",
    },
    "fomo": {
        "name": "FOMO (Fear of Missing Out)",
        "description_template": "Found {count} entries at prices significantly above recent averages, suggesting chasing moves rather than waiting for optimal entry points.",
    },
}

# Feature display configuration
FEATURE_DISPLAY = {
    "revenge_trading": [
        {
            "key": "revenge_trade_count",
            "display_name": "Revenge Trades Detected",
            "threshold_key": "time_window_threshold",
            "explanation_template": "{value} trades were placed within {threshold} after a losing trade.",
        },
        {
            "key": "avg_time_after_loss_minutes",
            "display_name": "Avg. Time After Loss",
            "threshold": "15 min",
            "explanation_template": "Average gap between a loss and the next trade is {value} min (healthy threshold: {threshold}).",
        },
    ],
    "overtrading": [
        {
            "key": "avg_daily_trades",
            "display_name": "Avg. Daily Trade Count",
            "threshold": "5 trades",
            "explanation_template": "You average {value} trades per day; exceeding {threshold} indicates potential overtrading.",
        },
        {
            "key": "overtrading_days",
            "display_name": "Excessive Trading Days",
            "threshold_key": "total_trading_days",
            "explanation_template": "{value} out of {threshold} trading days showed excessive activity.",
        },
    ],
    "panic_exit": [
        {
            "key": "total_flagged",
            "display_name": "Premature Exits",
            "threshold": "0 exits",
            "explanation_template": "{value} trades were exited prematurely, either due to panic or cutting winners short.",
        },
    ],
    "emotional_trading": [
        {
            "key": "position_size_cv",
            "display_name": "Position Size Variability",
            "threshold_key": "cv_threshold",
            "explanation_template": "Coefficient of variation is {value} (healthy max: {threshold}). Higher values indicate emotional sizing.",
        },
        {
            "key": "size_increase_after_loss_count",
            "display_name": "Size Increases After Losses",
            "threshold": "0",
            "explanation_template": "Position size was increased {value} times immediately after a losing trade.",
        },
    ],
    "overconfidence": [
        {
            "key": "size_increase_after_wins",
            "display_name": "Post-Win Size Increases",
            "threshold": "0",
            "explanation_template": "{value} times position size was increased after consecutive wins.",
        },
        {
            "key": "max_size_increase_ratio",
            "display_name": "Max Size Increase Ratio",
            "threshold": "1.0x",
            "explanation_template": "Largest position size increase was {value}x the previous trade.",
        },
    ],
    "fomo": [
        {
            "key": "fomo_entries",
            "display_name": "FOMO Entries",
            "threshold": "0",
            "explanation_template": "{value} trades entered at prices above the recent average (chasing the move).",
        },
    ],
}


def _get_risk_level(score: int) -> str:
    """Convert numeric score to risk level string."""
    if score >= 75:
        return "critical"
    elif score >= 50:
        return "high"
    elif score >= 25:
        return "medium"
    else:
        return "low"


def _get_impact_level(score: int) -> str:
    """Convert risk score to impact level for features."""
    if score >= 60:
        return "high"
    elif score >= 30:
        return "medium"
    else:
        return "low"


def build_behavioral_risks(result: AnalysisResult) -> List[BehavioralRisk]:
    """Build the behavioral risks section of the report."""
    risks = []

    for risk_key, score in sorted(result.risk_scores.items(), key=lambda x: x[1], reverse=True):
        info = RISK_DISPLAY_INFO.get(risk_key, {})
        features = result.features.get(risk_key, {})

        # Build description from template
        name = info.get("name", risk_key.replace("_", " ").title())
        template = info.get("description_template", "")

        try:
            description = template.format(
                count=features.get("revenge_trade_count", features.get("fomo_entries", features.get("size_increase_after_wins", features.get("total_flagged", 0)))),
                window=features.get("time_window_threshold", "15 min"),
                avg=features.get("avg_daily_trades", 0),
                days=features.get("overtrading_days", 0),
                cv=features.get("position_size_cv", 0),
                ratio=features.get("max_size_increase_ratio", 0),
            )
        except (KeyError, IndexError):
            description = f"Risk score: {score}%"

        risks.append(BehavioralRisk(
            name=name,
            score=score,
            level=_get_risk_level(score),
            description=description,
        ))

    return risks


def build_feature_importance(result: AnalysisResult) -> List[FeatureImportance]:
    """Build the feature importance section showing which features influenced predictions."""
    importance_list = []

    for risk_key, score in result.risk_scores.items():
        if score < 10:
            continue  # Skip negligible risks

        feature_configs = FEATURE_DISPLAY.get(risk_key, [])
        features = result.features.get(risk_key, {})

        for config in feature_configs:
            key = config["key"]
            value = features.get(key)
            if value is None:
                continue

            # Get threshold
            threshold = config.get("threshold", "")
            threshold_key = config.get("threshold_key")
            if threshold_key:
                threshold = str(features.get(threshold_key, threshold))

            # Build explanation
            try:
                explanation = config["explanation_template"].format(
                    value=value,
                    threshold=threshold,
                )
            except (KeyError, IndexError):
                explanation = f"{config['display_name']}: {value}"

            importance_list.append(FeatureImportance(
                feature=key,
                display_name=config["display_name"],
                value=str(value),
                threshold=str(threshold),
                impact=_get_impact_level(score),
                explanation=explanation,
            ))

    # Sort by impact: high → medium → low
    impact_order = {"high": 0, "medium": 1, "low": 2}
    importance_list.sort(key=lambda x: impact_order.get(x.impact, 3))

    return importance_list


def build_loss_analysis(result: AnalysisResult) -> List[LossCause]:
    """Build the loss analysis section."""
    return [
        LossCause(**cause)
        for cause in result.loss_causes
    ]


def build_future_risks(result: AnalysisResult) -> List[FutureRisk]:
    """Build the future behavioral risks section."""
    return [
        FutureRisk(**risk)
        for risk in result.future_risks
    ]


def build_summary_stats(result: AnalysisResult) -> SummaryStats:
    """Build the summary statistics section."""
    return SummaryStats(**result.summary)


def generate_report(result: AnalysisResult) -> AnalysisReport:
    """
    Generate the complete analysis report from raw analysis results.

    Args:
        result: The AnalysisResult from TradingAnalyzer.

    Returns:
        A fully structured AnalysisReport ready for API response.
    """
    return AnalysisReport(
        trader_profile=TraderProfile(
            type=result.profile_type,
            confidence=result.profile_confidence,
            description=result.profile_description,
        ),
        behavioral_risks=build_behavioral_risks(result),
        feature_importance=build_feature_importance(result),
        loss_analysis=build_loss_analysis(result),
        future_risks=build_future_risks(result),
        summary_stats=build_summary_stats(result),
    )
