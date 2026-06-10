"""
FastAPI – Trader Psychology Analyzer
=====================================
Handles the Groww-style Excel P&L report (and generic CSVs).
 
Project layout expected:
  src/
  ├── services/
  │   └── main.py                 ← this file
  ├── feature_engineering/
  │   └── generate_features.py
  ├── models/
  │   └── train_random_forest.py
  ├── explainability/
  │   └── shap_explainer.py
  ├── analysis/
  │   └── behavior_analysis.py
  ├── recommendations/
  │   └── recommendation_engine.py
  ├── reporting/
  │   └── report_generator.py
  └── temp/                       ← auto-created; upload staging
"""
 
import os
import sys
import uuid
import traceback
 
import numpy as np
import pandas as pd
import joblib
import shap
 
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
 
# ── path wiring so every src sub-package is importable ────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)
 
from feature_engineering.generate_features import generate_features
from analysis.behavior_analysis          import generate_analysis
from recommendations.recommendation_engine import get_recommendations
 
 
# ══════════════════════════════════════════════════════════════════════════════
# App
# ══════════════════════════════════════════════════════════════════════════════
 
app = FastAPI(
    title       = "Trader Psychology Analyzer",
    description = "Upload your Groww P&L Excel (or any trades CSV) to get a behavioral report.",
    version     = "1.0.0",
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # tighten in production
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Directories & paths
# ══════════════════════════════════════════════════════════════════════════════
 
TEMP_DIR   = os.path.join(BASE_DIR, "temp")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "random_forest.pkl")
 
os.makedirs(TEMP_DIR,   exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Column normalisation
#
# The Groww Excel uses "Stock name", "Buy date", "Realised P&L", etc.
# We map them all down to the snake_case names generate_features.py expects.
# ══════════════════════════════════════════════════════════════════════════════
 
COLUMN_MAP = {
    # ── stock / symbol ────────────────────────────────────────────────────────
    "stock name"       : "stock_name",
    "stock"            : "stock_name",
    "symbol"           : "stock_name",
    "scrip"            : "stock_name",
    "name"             : "stock_name",
 
    # ── dates ─────────────────────────────────────────────────────────────────
    "buy date"         : "buy_date",
    "purchase date"    : "buy_date",
    "entry date"       : "buy_date",
    "sell date"        : "sell_date",
    "sale date"        : "sell_date",
    "exit date"        : "sell_date",
 
    # ── prices ────────────────────────────────────────────────────────────────
    "buy price"        : "buy_price",
    "purchase price"   : "buy_price",
    "entry price"      : "buy_price",
    "sell price"       : "sell_price",
    "sale price"       : "sell_price",
    "exit price"       : "sell_price",
 
    # ── values ────────────────────────────────────────────────────────────────
    "buy value"        : "buy_value",
    "purchase value"   : "buy_value",
    "sell value"       : "sell_value",
    "sale value"       : "sell_value",
 
    # ── quantity ──────────────────────────────────────────────────────────────
    "quantity"         : "quantity",
    "qty"              : "quantity",
    "shares"           : "quantity",
    "units"            : "quantity",
 
    # ── P&L (Groww uses "realised p&l") ───────────────────────────────────────
    "realised p&l"     : "pnl",
    "realized p&l"     : "pnl",
    "profit/loss"      : "pnl",
    "profit & loss"    : "pnl",
    "p&l"              : "pnl",
    "pnl"              : "pnl",
    "net pnl"          : "pnl",
    "realised pnl"     : "pnl",
    "realized pnl"     : "pnl",
    "gain/loss"        : "pnl",
}
 
# Columns generate_features.py MUST have
REQUIRED_COLUMNS = ["buy_date", "sell_date", "buy_value", "sell_value", "pnl"]
 
# Human-readable feature names (for SHAP top-5 display)
FEATURE_NAMES = {
    "win_rate"                  : "Win Rate",
    "avg_profit"                : "Average Profit",
    "avg_loss"                  : "Average Loss",
    "profit_factor"             : "Profit Factor",
    "avg_return_pct"            : "Average Return Percentage",
    "avg_holding_days"          : "Average Holding Period",
    "holding_variance"          : "Holding Consistency",
    "trades_per_month"          : "Trading Frequency",
    "avg_trades_per_day"        : "Daily Trading Activity",
    "max_loss_streak"           : "Maximum Loss Streak",
    "max_win_streak"            : "Maximum Win Streak",
    "avg_position_size"         : "Average Position Size",
    "position_size_variance"    : "Position Size Consistency",
    "risk_escalation_ratio"     : "Risk Escalation",
    "pnl_std"                   : "Profit/Loss Volatility",
    "post_loss_position_change" : "Position Size Change After Loss",
    "post_loss_trade_delay"     : "Delay After Losing Trade",
    "avg_gap_between_trades"    : "Time Between Trades",
    "same_day_trade_ratio"      : "Same Day Trading Ratio",
}
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Model + SHAP – loaded once at startup
# ══════════════════════════════════════════════════════════════════════════════
 
model     = None  # type: Optional[object]
explainer = None  # type: Optional[object]
 
 
@app.on_event("startup")
def load_model():
    global model, explainer
    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Model not found at {MODEL_PATH}. "
              "Predictions will be skipped until the model is trained.")
        return
    model     = joblib.load(MODEL_PATH)
    explainer = shap.TreeExplainer(model)
    print("[INFO] Random Forest + SHAP loaded.")
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Pydantic response schemas
# ══════════════════════════════════════════════════════════════════════════════
 
class FeatureRow(BaseModel):
    trader_id                 : str
    win_rate                  : float
    avg_profit                : float
    avg_loss                  : float
    profit_factor             : float
    avg_return_pct            : float
    avg_holding_days          : float
    holding_variance          : float
    trades_per_month          : float
    avg_trades_per_day        : float
    max_loss_streak           : int
    max_win_streak            : int
    avg_position_size         : float
    position_size_variance    : float
    risk_escalation_ratio     : float
    pnl_std                   : float
    post_loss_position_change : float
    post_loss_trade_delay     : float
    avg_gap_between_trades    : float
    same_day_trade_ratio      : float
 
 
class TraderReport(BaseModel):
    trader_id       : str
    trader_type     : str
    top_features    : List[str]
    analysis        : str
    recommendations : List[str]
    features        : FeatureRow
 
 
class AnalyzeResponse(BaseModel):
    total_trades : int
    reports      : List[TraderReport]
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════
 
def parse_groww_excel(path: str) -> pd.DataFrame:
    """
    The Groww P&L Excel has a header block before the actual data rows.
    We scan for the row that contains 'Stock name' / 'Stock Name' and
    use that as the header.  Everything above it (client name, summary,
    charges) is discarded.
 
    Returns a raw DataFrame with the original Groww column names.
    """
    xl = pd.ExcelFile(path, engine="openpyxl")
    sheet = xl.sheet_names[0]           # always 'Trade Level'
 
    # Read without a header first so we can locate the real header row
    raw = pd.read_excel(path, sheet_name=sheet, header=None, engine="openpyxl")
 
    header_row_idx = None
    for i, row in raw.iterrows():
        row_vals = [str(v).strip().lower() for v in row if pd.notna(v)]
        if "stock name" in row_vals:
            header_row_idx = i
            break
 
    if header_row_idx is None:
        raise ValueError(
            "Could not locate the 'Stock name' header row in the Excel file. "
            "Expected a Groww-style P&L report."
        )
 
    # Re-read using the correct header row
    df = pd.read_excel(
        path,
        sheet_name  = sheet,
        header      = header_row_idx,
        engine      = "openpyxl",
    )
 
    # Keep only "Realised trades" rows (drop Unrealised block and disclaimer)
    # The unrealised block starts with a second occurrence of 'Stock name' as a value
    # Simply drop rows where Buy date is NaN (summary/disclaimer rows)
    df = df.dropna(subset=["Buy date"] if "Buy date" in df.columns
                            else [df.columns[3]])  # fallback: 4th column is buy date
 
    return df
 
 
def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Lowercase + strip all column names, apply COLUMN_MAP,
    then verify required columns exist.
    """
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    df = df.rename(columns=COLUMN_MAP)
 
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code = 422,
            detail = (
                f"Missing required columns after mapping: {missing}. "
                f"Columns detected in file: {list(df.columns)}"
            ),
        )
    return df
 
 
def add_trader_id(df: pd.DataFrame) -> pd.DataFrame:
    """Single-trader file → assign a default trader_id."""
    if "trader_id" not in df.columns:
        df = df.copy()
        df["trader_id"] = "trader_001"
    return df
 
 
def get_shap_top_features(
    feature_cols : list,
    shap_values  : np.ndarray,
    trader_index : int,
    class_index  : int,
    top_n        : int = 5,
) -> List[str]:
    values = np.abs(shap_values[trader_index, :, class_index])
    importance = (
        pd.DataFrame({"feature": feature_cols, "importance": values})
        .sort_values("importance", ascending=False)
        .head(top_n)["feature"]
        .tolist()
    )
    return [FEATURE_NAMES.get(f, f) for f in importance]
 
 
# ══════════════════════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════════════════════
 
@app.get("/")
def root():
    return {
        "message"   : "Trader Psychology Analyzer API — v1.0",
        "endpoints" : {
            "POST /analyze" : "Upload Groww Excel or generic CSV → get behavioral report",
            "GET  /health"  : "Model load status",
        },
    }
 
 
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}
 
 
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    """
    ┌─────────────────────────────────────────────────────┐
    │  WORKFLOW                                           │
    │                                                     │
    │  1. Receive file  (.xlsx / .xls / .csv)             │
    │  2. Save to  temp/<uuid>_<filename>                 │
    │  3. Parse:                                          │
    │       xlsx  →  parse_groww_excel()  (skip header)  │
    │       csv   →  pd.read_csv()                        │
    │  4. normalise_columns()  (COLUMN_MAP)               │
    │  5. add_trader_id()                                 │
    │  6. generate_features()  → feature vector          │
    │  7. Random Forest  →  trader_type prediction        │
    │  8. SHAP  →  top-5 behavioural drivers              │
    │  9. generate_analysis()  →  narrative text          │
    │ 10. get_recommendations()  →  action items          │
    │ 11. Build & return  TraderReport  JSON              │
    │ 12. Delete temp file                                │
    └─────────────────────────────────────────────────────┘
    """
 
    # ── 1. Validate extension ──────────────────────────────────────────────────
    filename  = file.filename or "upload"
    ext       = os.path.splitext(filename)[-1].lower()
 
    if ext not in (".csv", ".xlsx", ".xls"):
        raise HTTPException(
            status_code = 415,
            detail = "Only .csv, .xlsx, and .xls files are supported.",
        )
 
    # ── 2. Save to temp ────────────────────────────────────────────────────────
    temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}_{filename}")
 
    try:
        contents = await file.read()
        with open(temp_path, "wb") as fh:
            fh.write(contents)
 
        # ── 3. Parse ───────────────────────────────────────────────────────────
        if ext in (".xlsx", ".xls"):
            try:
                raw_df = parse_groww_excel(temp_path)   # Groww-aware parser
            except ValueError:
                # Fallback: plain Excel with headers on row 0
                raw_df = pd.read_excel(temp_path, engine="openpyxl")
        else:
            raw_df = pd.read_csv(temp_path)
 
        if raw_df.empty:
            raise HTTPException(status_code=422, detail="The uploaded file is empty.")
 
        total_trades = len(raw_df)
 
        # ── 4 & 5. Normalise columns + add trader_id ──────────────────────────
        raw_df = normalise_columns(raw_df)
        raw_df = add_trader_id(raw_df)
 
        # ── 6. Feature engineering ────────────────────────────────────────────
        features_df  = generate_features(raw_df)
        feature_cols = [c for c in features_df.columns if c != "trader_id"]
        X            = features_df[feature_cols]
 
        # ── 7–10. Predict + SHAP + Analysis + Recommendations ─────────────────
        reports = []
 
        if model is None:
            # Model not yet trained – return features + placeholder fields
            for _, row in features_df.iterrows():
                reports.append(TraderReport(
                    trader_id       = str(row["trader_id"]),
                    trader_type     = "model_not_loaded",
                    top_features    = [],
                    analysis        = "Model not loaded. Train the Random Forest first.",
                    recommendations = [],
                    features        = FeatureRow(**row.to_dict()),
                ))
        else:
            predictions = model.predict(X)
            shap_vals   = np.array(explainer.shap_values(X))
 
            # Normalise SHAP shape → (n_samples, n_features, n_classes)
            if shap_vals.ndim == 3 and shap_vals.shape[0] == len(model.classes_):
                shap_vals = shap_vals.transpose(1, 2, 0)
 
            for i, (_, row) in enumerate(features_df.iterrows()):
                trader_id   = str(row["trader_id"])
                trader_type = predictions[i]
                class_idx   = list(model.classes_).index(trader_type)
 
                top_features    = get_shap_top_features(
                    feature_cols, shap_vals, i, class_idx
                )
                analysis        = generate_analysis(trader_type, top_features)
                recommendations = get_recommendations(trader_type, top_features)
 
                reports.append(TraderReport(
                    trader_id       = trader_id,
                    trader_type     = trader_type,
                    top_features    = top_features,
                    analysis        = analysis,
                    recommendations = recommendations,
                    features        = FeatureRow(**row.to_dict()),
                ))
 
        # ── 11. Return ─────────────────────────────────────────────────────────
        return AnalyzeResponse(total_trades=total_trades, reports=reports)
 
    except HTTPException:
        raise
 
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing error: {exc}")
 
    finally:
        # ── 12. Clean up temp file ─────────────────────────────────────────────
        if os.path.exists(temp_path):
            os.remove(temp_path)