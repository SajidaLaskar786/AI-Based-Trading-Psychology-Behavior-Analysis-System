"""
Analysis API Route.
Handles file upload, triggers the analysis pipeline, and returns the report.
"""

import os
import io
import logging
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
import shap

from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import AnalysisReport, TraderProfile, FeatureImportance
from services.file_parser import parse_trading_file, FileParsingError, _read_file, _normalize_columns
from services.analyzer import TradingAnalyzer
from services.report_generator import generate_report
from src.feature_engineering.generate_features import generate_features
from services.notifications import NotificationEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Analysis"])

# Maximum file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file extensions
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


# ─── Configuration & Lookups ──────────────────────────────────────────────────

PROFILE_DESCRIPTIONS = {
    "Emotional Trader": "Your trading is significantly influenced by emotional reactions. You tend to make impulsive decisions after losses and show high variability in position sizing, indicating that feelings rather than strategy drive many of your trades.",
    "Impulsive Trader": "You exhibit a pattern of acting quickly without thorough analysis. Frequent trading, chasing moves, and reacting to losses with immediate new positions suggest impulsivity drives your decision-making.",
    "Overconfident Trader": "After winning trades, you tend to increase risk significantly. This pattern of escalating position sizes following success suggests overconfidence bias, which often leads to outsized losses when the streak ends.",
    "Risk-Averse Trader": "You frequently exit positions too early, cutting profits short due to fear. While this limits downside, it also severely caps upside potential. Your trading shows a pattern of prioritizing loss avoidance over gain optimization.",
    "Disciplined Trader": "Your trading shows consistent position sizing, measured timing between trades, and relatively low emotional reactivity. You demonstrate good discipline in following a strategy without letting emotions dictate decisions."
}

FEATURE_DETAILS_LOOKUP = {
    "win_rate": {
        "display_name": "Win Rate",
        "threshold": "50%",
        "explanation": "Percentage of profitable trades. A rate below 50% means you have more losing than winning trades."
    },
    "avg_profit": {
        "display_name": "Average Profit",
        "threshold": "> $0",
        "explanation": "Average monetary profit per winning trade."
    },
    "avg_loss": {
        "display_name": "Average Loss",
        "threshold": "< Average Profit",
        "explanation": "Average monetary loss per losing trade. Optimally, average loss should be smaller than average profit."
    },
    "profit_factor": {
        "display_name": "Profit Factor",
        "threshold": "1.5",
        "explanation": "Gross profits divided by gross losses. A factor below 1.0 means trading is unprofitable."
    },
    "avg_return_pct": {
        "display_name": "Average Return Percentage",
        "threshold": "> 0%",
        "explanation": "Average return percentage per trade."
    },
    "avg_holding_days": {
        "display_name": "Average Holding Period",
        "threshold": "Varies",
        "explanation": "Average number of days a trade is held."
    },
    "holding_variance": {
        "display_name": "Holding Consistency",
        "threshold": "Low variance",
        "explanation": "Variance in holding time. High variance indicates inconsistent hold times, possibly holding losers too long."
    },
    "trades_per_month": {
        "display_name": "Trading Frequency",
        "threshold": "10-30 trades",
        "explanation": "Average number of trades per month. High numbers may indicate overtrading."
    },
    "avg_trades_per_day": {
        "display_name": "Daily Trading Activity",
        "threshold": "< 5 trades",
        "explanation": "Average number of trades per active day. Exceeding 5-8 trades daily is often a sign of overtrading."
    },
    "max_loss_streak": {
        "display_name": "Maximum Loss Streak",
        "threshold": "< 5 trades",
        "explanation": "Maximum number of consecutive losing trades. Long streaks can trigger revenge trading."
    },
    "max_win_streak": {
        "display_name": "Maximum Win Streak",
        "threshold": "N/A",
        "explanation": "Maximum number of consecutive winning trades. Can lead to overconfidence bias."
    },
    "avg_position_size": {
        "display_name": "Average Position Size",
        "threshold": "Consistent",
        "explanation": "Average monetary size of your trading positions."
    },
    "position_size_variance": {
        "display_name": "Position Size Consistency",
        "threshold": "Low variance",
        "explanation": "Volatility of position sizes. High variance indicates lack of disciplined risk management."
    },
    "risk_escalation_ratio": {
        "display_name": "Risk Escalation",
        "threshold": "1.0",
        "explanation": "Ratio of average size in second half of history vs first half. Values above 1.3 indicate escalating risk."
    },
    "pnl_std": {
        "display_name": "Profit/Loss Volatility",
        "threshold": "Low",
        "explanation": "Standard deviation of trade outcomes. Higher values mean higher risk and equity curve volatility."
    },
    "post_loss_position_change": {
        "display_name": "Position Size Change After Loss",
        "threshold": "<= 0",
        "explanation": "Average change in position size after a loss. Positive values show a tendency to size up (revenge trading)."
    },
    "post_loss_trade_delay": {
        "display_name": "Delay After Losing Trade",
        "threshold": "> 1 day",
        "explanation": "Average days wait before trading again after a loss. Near-zero delay suggests emotional retaliation."
    },
    "avg_gap_between_trades": {
        "display_name": "Time Between Trades",
        "threshold": "> 1 day",
        "explanation": "Average days between consecutive trades. Very low gaps suggest overtrading."
    },
    "same_day_trade_ratio": {
        "display_name": "Same Day Trading Ratio",
        "threshold": "< 20%",
        "explanation": "Ratio of trades placed on the same day. High ratios indicate day-trading style or emotional churn."
    }
}


# ─── Helper Functions ─────────────────────────────────────────────────────────

def format_feature_value(feature_name: str, value: float) -> str:
    """Format feature values into human-readable strings based on metric type."""
    if feature_name in ["win_rate", "same_day_trade_ratio"]:
        return f"{value * 100:.1f}%"
    elif feature_name in ["avg_return_pct"]:
        return f"{value:.2f}%"
    elif feature_name in ["avg_profit", "avg_loss", "avg_position_size", "pnl_std", "post_loss_position_change"]:
        if value < 0:
            return f"-${abs(value):,.2f}"
        return f"${value:,.2f}"
    elif feature_name in ["avg_holding_days", "post_loss_trade_delay", "avg_gap_between_trades"]:
        return f"{value:.2f} days"
    elif feature_name in ["profit_factor", "risk_escalation_ratio", "max_size_increase_ratio"]:
        return f"{value:.2f}x"
    else:
        if isinstance(value, float):
            return f"{value:.2f}"
        return str(value)


def _to_numeric_clean(series: pd.Series) -> pd.Series:
    """Clean formatting characters like currency symbols, commas, and parentheses from a series."""
    if series.dtype == object:
        cleaned = series.fillna("").astype(str).str.strip()
        cleaned = cleaned.str.replace(r'[$\s,]', '', regex=True)
        cleaned = cleaned.str.replace(r'^\((.*)\)$', r'-\1', regex=True)
        cleaned = cleaned.replace('', np.nan)
        return pd.to_numeric(cleaned, errors="coerce")
    return pd.to_numeric(series, errors="coerce")


def prepare_round_trip_df(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Parses and normalizes file bytes to produce a clean round-trip trade DataFrame.
    Matches column expectations for feature generation.
    """
    # 1. Read file raw structure
    df_raw = _read_file(file_bytes, filename)
    
    # 2. Normalize columns using file_parser mapping aliases
    df = _normalize_columns(df_raw)
    
    # 3. Clean and fill missing fields
    if "symbol" not in df.columns or "quantity" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="Missing required columns. The file must contain at least 'symbol' (or stock/ticker) and 'quantity'."
        )
        
    df["quantity"] = _to_numeric_clean(df["quantity"])
    df = df.dropna(subset=["symbol", "quantity"])
    df = df[df["quantity"] > 0]
    
    # 4. Handle date column structure (defaulting to date if buy/sell are not split)
    for date_col in ["buy_date", "sell_date"]:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
        else:
            # Fallback to date column if available
            if "date" in df.columns:
                df[date_col] = pd.to_datetime(df["date"], errors="coerce", dayfirst=True)
            else:
                df[date_col] = pd.NaT
                
    df = df.dropna(subset=["buy_date", "sell_date"])
    
    if len(df) == 0:
        raise HTTPException(
            status_code=400,
            detail="Could not extract valid buy and sell timestamps from data."
        )

    # 5. Extract prices and compute values
    if "buy_price" in df.columns:
        df["buy_price"] = _to_numeric_clean(df["buy_price"]).fillna(0.0)
    else:
        df["buy_price"] = 0.0
        
    if "sell_price" in df.columns:
        df["sell_price"] = _to_numeric_clean(df["sell_price"]).fillna(0.0)
    else:
        df["sell_price"] = 0.0
    
    if "buy_value" in df.columns:
        buy_val = _to_numeric_clean(df["buy_value"]).fillna(0.0)
    else:
        buy_val = pd.Series(0.0, index=df.index)
    df["buy_value"] = np.where(buy_val == 0.0, df["buy_price"] * df["quantity"], buy_val)
    
    if "sell_value" in df.columns:
        sell_val = _to_numeric_clean(df["sell_value"]).fillna(0.0)
    else:
        sell_val = pd.Series(0.0, index=df.index)
    df["sell_value"] = np.where(sell_val == 0.0, df["sell_price"] * df["quantity"], sell_val)
    
    # 6. Extract/Compute PNL
    if "pnl" in df.columns:
        pnl_val = _to_numeric_clean(df["pnl"]).fillna(0.0)
    else:
        pnl_val = pd.Series(0.0, index=df.index)
    df["pnl"] = np.where(pnl_val == 0.0, df["sell_value"] - df["buy_value"], pnl_val)
    
    # 7. Add default trader_id if missing
    if "trader_id" not in df.columns:
        df["trader_id"] = "user_uploaded"
        
    return df



# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@router.post("/analyze", response_model=AnalysisReport)
async def analyze_trading_history(
    file: UploadFile = File(..., description="CSV or Excel file containing trading P&L history")
):
    """
    Upload a trading history file and receive an ML-powered behavioral analysis report.

    Accepts CSV (.csv) or Excel (.xlsx, .xls) files containing brokerage
    P&L statements. The file is saved, features are extracted dynamically,
    passed through a pre-trained Random Forest model, explained using SHAP values,
    and returns a structured trader psychology profile.
    """
    # ── Validate file extension ──
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    extension = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{extension}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # ── Read file bytes ──
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )

    # Setup directories and paths
    os.makedirs("temp", exist_ok=True)
    upload_path = "temp/upload.csv"
    features_path = "temp/trader_features.csv"

    try:
        # ── Step 1: File Upload Validation & Saving ──
        try:
            df_round_trip = prepare_round_trip_df(file_bytes, file.filename)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Error preparing round trip dataframe")
            raise HTTPException(
                status_code=422,
                detail=f"Failed to normalize trading history format: {str(e)}"
            )

        # Save to temp/upload.csv
        df_round_trip.to_csv(upload_path, index=False)

        # ── Step 2: Feature Generation Integration ──
        try:
            features_df = generate_features(df_round_trip)
            features_df.to_csv(features_path, index=False)
        except Exception as e:
            logger.exception("Feature generation failed")
            raise HTTPException(
                status_code=500,
                detail=f"Feature generation from trading data failed: {str(e)}"
            )

        if features_df.empty:
            raise HTTPException(
                status_code=422,
                detail="No features could be generated from the provided trading history."
            )

        # ── Sanitize features: replace inf/-inf, fill NaN, clip to float32 range ──
        features_df = features_df.replace([np.inf, -np.inf], np.nan)
        features_df = features_df.fillna(0.0)

        # ── Step 3: Model Prediction Pipeline ──
        model_path = Path("models/random_forest.pkl")
        if not model_path.exists():
            model_path = Path(__file__).resolve().parent.parent / "models" / "random_forest.pkl"
        
        if not model_path.exists():
            raise HTTPException(
                status_code=500,
                detail="Pre-trained Random Forest model file (random_forest.pkl) not found on backend."
            )

        try:
            model = joblib.load(model_path)
        except Exception as e:
            logger.exception("Failed to load model")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load trained model: {str(e)}"
            )

        # Drop non-feature columns
        X = features_df.drop(columns=["trader_id"], errors="ignore")

        # Final safety: clip all values to float32 safe range to prevent overflow
        FLOAT32_MAX = np.finfo(np.float32).max
        X = X.clip(lower=-FLOAT32_MAX, upper=FLOAT32_MAX)

        try:
            prediction = model.predict(X)[0]
            confidence = float(model.predict_proba(X).max() * 100)
        except Exception as e:
            logger.exception("Model prediction failed")
            raise HTTPException(
                status_code=500,
                detail=f"Model prediction failed: {str(e)}"
            )

        # ── Step 4: SHAP Explainability ──
        try:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)
            class_index = list(model.classes_).index(prediction)
            
            # Robust extraction of SHAP values depending on SHAP format
            if isinstance(shap_values, list):
                values = np.abs(shap_values[class_index][0])
            elif isinstance(shap_values, np.ndarray):
                if len(shap_values.shape) == 3:
                    values = np.abs(shap_values[0, :, class_index])
                else:
                    values = np.abs(shap_values[0])
            else:
                if hasattr(shap_values, "values"):
                    sh_vals = shap_values.values
                    if len(sh_vals.shape) == 3:
                        values = np.abs(sh_vals[0, :, class_index])
                    else:
                        values = np.abs(sh_vals[0])
                else:
                    values = np.abs(shap_values[0])
            
            feature_importance_df = pd.DataFrame({
                "feature": X.columns,
                "importance": values
            }).sort_values(by="importance", ascending=False)
            
        except Exception as e:
            logger.exception("SHAP explainer failed, falling back to Random Forest default importances")
            # Robust fallback to standard random forest feature importances
            importances = model.feature_importances_
            feature_importance_df = pd.DataFrame({
                "feature": X.columns,
                "importance": importances
            }).sort_values(by="importance", ascending=False)

        # Build feature importance list (top 5 drivers)
        feature_importance_list = []
        ranked_features = feature_importance_df.to_dict(orient="records")
        for idx, item in enumerate(ranked_features[:5]):
            feat_name = item["feature"]
            raw_val = float(features_df[feat_name].values[0])
            details = FEATURE_DETAILS_LOOKUP.get(feat_name, {
                "display_name": feat_name.replace("_", " ").title(),
                "threshold": "N/A",
                "explanation": "Behavioral driver influencing the predicted classification."
            })
            impact = "high" if idx < 2 else ("medium" if idx < 4 else "low")
            
            feature_importance_list.append(FeatureImportance(
                feature=feat_name,
                display_name=details["display_name"],
                value=format_feature_value(feat_name, raw_val),
                threshold=details["threshold"],
                impact=impact,
                explanation=details["explanation"]
            ))

        # ── Step 5: Rule-based Detailed Analytics ──
        try:
            df_trades = parse_trading_file(file_bytes, file.filename)
        except FileParsingError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            logger.exception("Unexpected error during file parsing to individual trade rows")
            raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")

        try:
            analyzer = TradingAnalyzer(df_trades)
            analysis_result = analyzer.run_full_analysis()
        except Exception as e:
            logger.exception("Unexpected error during detailed risk analysis")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

        # ── Step 6: Structured Report Generation & Assembly ──
        try:
            report = generate_report(analysis_result)
        except Exception as e:
            logger.exception("Unexpected error during report structure generation")
            raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

        # Merge machine learning predictions & SHAP explanations
        profile_desc = PROFILE_DESCRIPTIONS.get(prediction, analysis_result.profile_description)
        report.trader_profile = TraderProfile(
            type=prediction,
            confidence=int(round(confidence)),
            description=profile_desc
        )
        report.feature_importance = feature_importance_list

        # ── Step 7: Notification Engine ──
        try:
            notif_engine = NotificationEngine(df_round_trip)
            alerts_data = notif_engine.evaluate()
            report.notifications = alerts_data
        except Exception as e:
            logger.exception(f"Unexpected error during notification evaluation: {e}")
            report.notifications = []

        logger.info(
            f"Analysis complete for '{file.filename}' (ML model): "
            f"profile={report.trader_profile.type}, "
            f"confidence={report.trader_profile.confidence}%"
        )

        return report

    finally:
        # Clean up temporary files
        for path_str in [upload_path, features_path]:
            try:
                if os.path.exists(path_str):
                    os.remove(path_str)
            except Exception as e:
                logger.error(f"Error cleaning up temporary file {path_str}: {str(e)}")
