# AI-Based Trading Psychology & Behavior Analysis System - Model Structure & ML Pipeline

This document explains the internal structure of the Machine Learning models, feature engineering definitions, prediction pipelines, and explainability systems used in the TradePsych AI platform.

---

## 1. Pipeline Architecture Flow

The system processes transaction-level trading history files (CSV/Excel) and converts them into standardized cognitive risk profiles:

```
[Uploaded Broker P&L Data] 
           │
           ▼ (services/file_parser.py)
[Standardized Trade Records] 
           │
           ▼ (src/feature_engineering/generate_features.py)
[18-Dimensional Feature Matrix (X)] 
           │
           ▼ (routes/analysis.py - sanitization & scaling)
[Sanitized Float32 Features]
           ├───────────────────────────────┐
           ▼ (models/random_forest.pkl)   ▼ (shap.TreeExplainer)
[Class Probability Vectors]         [SHAP Feature Importance Values]
           │                               │
           └───────────────┬───────────────┘
                           ▼ (services/report_generator.py)
             [Comprehensive Analysis Report JSON]
```

---

## 2. Feature Engineering Definitions

The pipeline computes **18 behavioral and performance features** grouped into four cognitive domains:

| Domain | Feature Code | Display Name | Definition / Rule |
| :--- | :--- | :--- | :--- |
| **Performance** | `win_rate` | Win Rate | Ratio of winning trades to total trades |
| | `avg_profit` | Average Profit | Mean P&L of all profitable trades |
| | `avg_loss` | Average Loss | Mean absolute loss of all negative trades |
| | `profit_factor` | Profit Factor | Ratio of gross profit to gross loss: $\sum(\text{wins}) / \sum(\losing\_trades)$ |
| | `avg_return_pct` | Avg Return Pct | Mean percentage return per trade |
| **Behavioral** | `avg_holding_days` | Avg Holding Period | Average duration (in days) a position is kept open |
| | `holding_variance` | Holding Consistency | Standard deviation of trade holding durations |
| | `trades_per_month` | Trading Frequency | Total trades normalized by active month span |
| | `avg_trades_per_day` | Daily Activity | Total trades divided by total days between first and last trade |
| | `max_loss_streak` | Max Loss Streak | Maximum consecutive losing trades in sequence |
| | `max_win_streak` | Max Win Streak | Maximum consecutive winning trades in sequence |
| **Risk** | `avg_position_size` | Avg Position Size | Mean cost of purchase (`buy_value`) across history |
| | `position_size_variance` | Position Size Consistency | Standard deviation of position sizing |
| | `pnl_std` | P&L Volatility | Standard deviation of trade P&L values |
| | `risk_escalation_ratio` | Risk Escalation | Ratio of mean position size in the 2nd half vs the 1st half |
| **Psychology** | `post_loss_position_change`| Size Change After Loss | Mean difference in size of trade $i+1$ vs $i$, if $i$ was a loss |
| | `post_loss_trade_delay` | Delay After Loss | Mean days elapsed between closing a loss and opening next position |
| | `avg_gap_between_trades`| Time Between Trades | Mean days elapsed between consecutive trade openings |
| | `same_day_trade_ratio`  | Same Day Trading Ratio | Ratio of trades opened on the same day as previous trades |

---

## 3. Machine Learning Models

### 3.1 Random Forest Classifier (`models/random_forest.pkl`)
- **Type**: Ensemble Decision Tree Classifier.
- **Input**: The 18-dimensional feature vector derived from the trader's history.
- **Output**: Multi-class probability distributions predicting the primary trader profile classification.
- **Target Profiles**:
  1. **Disciplined Trader**: Characterized by consistent position sizing, measured trade delays, and balanced holding times.
  2. **Emotional Trader**: Characterized by high variance in position sizes and short delays following losses.
  3. **Impulsive Trader**: Characterized by high same-day trade ratios and elevated daily trade counts.
  4. **Overconfident Trader**: Features steep risk escalation ratios and enlarged position sizing following winning streaks.
  5. **Risk-Averse Trader**: Characterized by cutting winners short (skewed holding times) and small, stagnant position sizes.

### 3.2 Feature Sanitization Engine
Prior to classification, the backend processes raw engineered features to prevent numeric overflows and mathematical anomalies (e.g., division by zero when losses are zero):
- **Replacement**: `+inf` and `-inf` values are cast to `NaN`.
- **Imputation**: `NaN` values are filled with `0.0`.
- **Scaling**: Applied using a pre-saved Standard Scaler (`scaler.pkl`).

---

## 4. SHAP (SHapley Additive exPlanations) Explainability

To provide deep behavioral self-awareness, the model integrates a **Tree SHAP explainer** (`shap`). 

Instead of showing static global feature importance, the backend computes **local Shapley values** for the specific trader. These represent how each metric shifted the classifier's prediction from the base expected outcome to the final target profile classification:

- **Impact Calculation**: A feature's contribution is rated **high**, **medium**, or **low** based on the absolute value of its Shapley score.
- **Feature Benchmarking**: The user's features are compared against calibrated thresholds (e.g., `avg_gap_between_trades` $< 1\text{ day}$) to give context-aware explanations on what drove the behavioral classification.
