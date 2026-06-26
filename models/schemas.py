"""
Pydantic response models for the Trading Behavior Analysis API.
Defines the structured output format for trader psychology reports.
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class Notification(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    message: str
    metric_value: str
    threshold: str


class TraderProfile(BaseModel):
    """Trader personality classification based on behavioral analysis."""
    type: str = Field(..., description="Profile type (e.g., 'Emotional Trader', 'Disciplined Trader')")
    confidence: int = Field(..., ge=0, le=100, description="Confidence score for the classification (0-100)")
    description: str = Field(..., description="Detailed explanation of the profile classification")


class BehavioralRisk(BaseModel):
    """Individual behavioral risk detected in trading history."""
    name: str = Field(..., description="Human-readable risk name (e.g., 'Revenge Trading')")
    score: int = Field(..., ge=0, le=100, description="Risk severity score (0-100)")
    level: str = Field(..., description="Risk level: 'low', 'medium', 'high', or 'critical'")
    description: str = Field(..., description="Detailed description of the detected risk pattern")


class FeatureImportance(BaseModel):
    """Feature that influenced the behavioral risk predictions."""
    feature: str = Field(..., description="Internal feature key")
    display_name: str = Field(..., description="Human-readable feature name")
    value: str = Field(..., description="Observed value of the feature")
    threshold: str = Field(..., description="Threshold or benchmark for comparison")
    impact: str = Field(..., description="Impact level: 'low', 'medium', or 'high'")
    explanation: str = Field(..., description="Plain-English explanation of what this feature means")


class LossCause(BaseModel):
    """Behavioral cause contributing to trading losses."""
    cause: str = Field(..., description="Name of the behavioral cause")
    description: str = Field(..., description="Explanation of how this behavior caused losses")
    affected_trades: int = Field(..., ge=0, description="Number of trades affected by this behavior")
    total_loss: float = Field(..., description="Total monetary loss attributed to this cause")
    percentage_of_total_loss: float = Field(..., ge=0, le=100, description="Percentage of total losses from this cause")


class FutureRisk(BaseModel):
    """Predicted behavioral pattern likely to recur."""
    pattern: str = Field(..., description="Description of the recurring behavioral pattern")
    likelihood: str = Field(..., description="Likelihood of recurrence: 'low', 'medium', or 'high'")
    recommendation: str = Field(..., description="Actionable advice to mitigate this risk")
    supporting_evidence: str = Field(..., description="Data points supporting the prediction")


class SummaryStats(BaseModel):
    """Overall trading performance statistics."""
    total_trades: int = Field(..., ge=0, description="Total number of trades analyzed")
    winning_trades: int = Field(..., ge=0, description="Number of winning trades")
    losing_trades: int = Field(..., ge=0, description="Number of losing trades")
    win_rate: float = Field(..., ge=0, le=100, description="Win rate as a percentage")
    total_pnl: float = Field(..., description="Total realized profit and loss")
    average_pnl_per_trade: float = Field(..., description="Average P&L per trade")
    avg_holding_duration_minutes: Optional[float] = Field(None, description="Average holding duration in minutes")
    max_consecutive_losses: int = Field(..., ge=0, description="Maximum consecutive losing trades")
    max_consecutive_wins: int = Field(..., ge=0, description="Maximum consecutive winning trades")
    largest_win: float = Field(..., description="Largest single winning trade P&L")
    largest_loss: float = Field(..., description="Largest single losing trade P&L")
    profit_factor: Optional[float] = Field(None, description="Gross profit / gross loss ratio")


class AnalysisReport(BaseModel):
    """Complete trader behavior analysis report."""
    trader_profile: TraderProfile
    behavioral_risks: List[BehavioralRisk]
    feature_importance: List[FeatureImportance]
    loss_analysis: List[LossCause]
    future_risks: List[FutureRisk]
    summary_stats: SummaryStats
    notifications: Optional[List[Notification]] = []


class ErrorResponse(BaseModel):
    """Standard error response format."""
    detail: str = Field(..., description="Detailed error message")

