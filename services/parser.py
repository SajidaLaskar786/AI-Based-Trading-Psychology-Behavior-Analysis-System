"""
File Parser Service.
Handles CSV and Excel file parsing, column validation, and data normalization.
"""

import pandas as pd
import io
from typing import List, Tuple
from fastapi import UploadFile, HTTPException


# Required columns (case-insensitive, whitespace-trimmed)
REQUIRED_COLUMNS = {"date", "symbol", "action", "quantity", "price"}
OPTIONAL_COLUMNS = {"pnl", "holding_duration_minutes", "entry_time", "exit_time"}

# Column name aliases for flexibility
COLUMN_ALIASES = {
    "ticker": "symbol",
    "stock": "symbol",
    "instrument": "symbol",
    "side": "action",
    "type": "action",
    "trade_type": "action",
    "buy_sell": "action",
    "qty": "quantity",
    "size": "quantity",
    "volume": "quantity",
    "lot_size": "quantity",
    "trade_price": "price",
    "avg_price": "price",
    "execution_price": "price",
    "profit": "pnl",
    "profit_loss": "pnl",
    "p&l": "pnl",
    "pl": "pnl",
    "realized_pnl": "pnl",
    "net_pnl": "pnl",
    "holding_duration": "holding_duration_minutes",
    "duration": "holding_duration_minutes",
    "duration_minutes": "holding_duration_minutes",
    "hold_time": "holding_duration_minutes",
    "trade_date": "date",
    "timestamp": "date",
    "datetime": "date",
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names: lowercase, strip whitespace, apply aliases."""
    # Lowercase and strip
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

    # Apply aliases
    rename_map = {}
    for col in df.columns:
        if col in COLUMN_ALIASES:
            rename_map[col] = COLUMN_ALIASES[col]
    if rename_map:
        df = df.rename(columns=rename_map)

    return df


def _validate_columns(df: pd.DataFrame) -> List[str]:
    """Validate that all required columns are present. Returns list of missing columns."""
    current_cols = set(df.columns)
    missing = REQUIRED_COLUMNS - current_cols
    return list(missing)


def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and convert data types."""
    # Convert numeric columns
    for col in ["quantity", "price", "pnl", "holding_duration_minutes"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Normalize action column
    if "action" in df.columns:
        df["action"] = df["action"].astype(str).str.strip().str.lower()
        # Standardize action values
        action_map = {
            "b": "buy", "buy": "buy", "long": "buy",
            "s": "sell", "sell": "sell", "short": "sell",
        }
        df["action"] = df["action"].map(action_map).fillna(df["action"])

    # Ensure symbol is string
    if "symbol" in df.columns:
        df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()

    # Convert date column
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        df["date"] = df["date"].dt.strftime("%Y-%m-%d %H:%M:%S")

    # Drop rows with missing critical values
    df = df.dropna(subset=["symbol", "action", "quantity", "price"])

    return df


async def parse_upload_file(file: UploadFile) -> Tuple[pd.DataFrame, dict]:
    """
    Parse an uploaded CSV or Excel file into a cleaned DataFrame.

    Args:
        file: The uploaded file from FastAPI.

    Returns:
        Tuple of (cleaned DataFrame, parsing metadata dict).

    Raises:
        HTTPException: If file type is unsupported or required columns are missing.
    """
    # Check file extension
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ("csv", "xlsx", "xls"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{extension}. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file."
        )

    # Read file content
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # Parse based on type
    try:
        if extension == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}"
        )

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    # Normalize columns
    df = _normalize_columns(df)

    # Validate required columns
    missing = _validate_columns(df)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}. "
                   f"Required: {', '.join(sorted(REQUIRED_COLUMNS))}. "
                   f"Found: {', '.join(sorted(df.columns.tolist()))}"
        )

    # Clean data
    original_count = len(df)
    df = _clean_data(df)
    cleaned_count = len(df)

    metadata = {
        "filename": filename,
        "original_rows": original_count,
        "valid_rows": cleaned_count,
        "dropped_rows": original_count - cleaned_count,
        "columns_found": df.columns.tolist(),
    }

    return df, metadata
