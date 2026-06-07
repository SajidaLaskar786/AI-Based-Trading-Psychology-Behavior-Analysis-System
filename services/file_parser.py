"""
File Parser Service.
Parses brokerage P&L statement CSV/Excel files into the normalized DataFrame
format expected by the TradingAnalyzer.

Handles:
- Skipping metadata/header rows in brokerage statements
- Detecting the actual data header row dynamically
- Splitting each P&L row into BUY and SELL trade records
- Computing derived columns (holding duration, trade value)
- Supporting both CSV and Excel formats
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
import io
import logging

logger = logging.getLogger(__name__)

# ─── Column Mapping ──────────────────────────────────────────────────────────
# Maps common brokerage column names (case-insensitive) to internal names.
# The parser tries all known aliases for each required field.

COLUMN_ALIASES = {
    "symbol": ["stock name", "stock_name", "symbol", "scrip", "instrument", "name", "security"],
    "isin": ["isin", "isin code"],
    "quantity": ["quantity", "qty", "trade qty", "trade_qty", "volume"],
    "buy_date": ["buy date", "buy_date", "purchase date", "purchase_date", "entry date", "entry_date"],
    "buy_price": ["buy price", "buy_price", "purchase price", "purchase_price", "entry price", "avg buy price"],
    "buy_value": ["buy value", "buy_value", "purchase value"],
    "sell_date": ["sell date", "sell_date", "exit date", "exit_date"],
    "sell_price": ["sell price", "sell_price", "exit price", "exit_price", "avg sell price"],
    "sell_value": ["sell value", "sell_value"],
    "pnl": ["realised p&l", "realised_p&l", "realized p&l", "realized_p&l", "p&l", "pnl",
            "profit/loss", "profit_loss", "net p&l", "realised p&l."],
    "remark": ["remark", "remarks", "note", "notes"],
}

# Markers that identify the header row in brokerage statements
HEADER_MARKERS = ["stock name", "scrip", "instrument", "symbol", "isin"]


class FileParsingError(Exception):
    """Raised when the uploaded file cannot be parsed into valid trade data."""
    pass


def _detect_header_row(df_raw: pd.DataFrame) -> Optional[int]:
    """
    Scan the raw DataFrame to find the row containing the actual column headers.
    Brokerage statements often have metadata rows (name, client code, summary,
    charges) before the actual trade data.

    Returns the row index of the header row, or None if headers are already correct.
    """
    # First check if current columns already contain expected headers
    current_cols = [str(c).strip().lower() for c in df_raw.columns]
    for marker in HEADER_MARKERS:
        if marker in current_cols:
            return None  # Headers are already in the column row

    # Scan first 30 rows for the header row
    for idx in range(min(30, len(df_raw))):
        row_values = [str(v).strip().lower() for v in df_raw.iloc[idx].values if pd.notna(v)]
        for marker in HEADER_MARKERS:
            if marker in row_values:
                return idx

    return None


def _resolve_column(df: pd.DataFrame, internal_name: str) -> Optional[str]:
    """
    Find the actual DataFrame column name that matches an internal field name
    using the alias mapping.

    Returns the actual column name or None if not found.
    """
    aliases = COLUMN_ALIASES.get(internal_name, [internal_name])
    df_cols_lower = {str(c).strip().lower(): c for c in df.columns}

    for alias in aliases:
        if alias.lower() in df_cols_lower:
            return df_cols_lower[alias.lower()]

    return None


def _read_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Read a CSV or Excel file into a raw DataFrame.

    Args:
        file_bytes: The raw file bytes.
        filename: Original filename (used to determine format).

    Returns:
        Raw DataFrame before any processing.
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".csv":
        # Try common encodings
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                return pd.read_csv(io.BytesIO(file_bytes), encoding=encoding, header=0)
            except UnicodeDecodeError:
                continue
        raise FileParsingError("Could not decode CSV file. Please ensure it is UTF-8 or Latin-1 encoded.")

    elif suffix in (".xlsx", ".xls"):
        try:
            return pd.read_excel(io.BytesIO(file_bytes), header=0, engine="openpyxl")
        except Exception as e:
            raise FileParsingError(f"Could not read Excel file: {str(e)}")

    else:
        raise FileParsingError(f"Unsupported file format: '{suffix}'. Please upload a .csv, .xlsx, or .xls file.")


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect the header row, re-read data from that point, and map
    brokerage column names to internal names.
    """
    # Step 1: Find the actual header row
    header_idx = _detect_header_row(df)

    if header_idx is not None:
        # Set the detected row as column headers and slice data below it
        new_headers = [str(v).strip() for v in df.iloc[header_idx].values]
        df = df.iloc[header_idx + 1:].reset_index(drop=True)
        df.columns = new_headers

    # Step 2: Clean column names (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]

    # Step 3: Resolve each internal field to its actual column name
    column_map = {}
    for internal_name in COLUMN_ALIASES:
        actual_col = _resolve_column(df, internal_name)
        if actual_col is not None:
            column_map[actual_col] = internal_name

    df = df.rename(columns=column_map)

    return df


def _build_trade_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert brokerage P&L rows into individual trade records.

    Each brokerage row represents a completed round-trip (buy → sell).
    We split each into two records — a BUY and a SELL — so the analyzer
    can track sequential trading behavior.

    Returns a DataFrame with columns:
        symbol, date, quantity, price, action, pnl, trade_value,
        holding_duration_minutes
    """
    trades = []

    for _, row in df.iterrows():
        symbol = row.get("symbol")
        if pd.isna(symbol) or str(symbol).strip() == "":
            continue

        symbol = str(symbol).strip()
        quantity = pd.to_numeric(row.get("quantity", 0), errors="coerce") or 0

        # Skip rows with no quantity (likely sub-headers or totals)
        if quantity == 0:
            continue

        # Parse dates
        buy_date = pd.to_datetime(row.get("buy_date"), errors="coerce", dayfirst=True)
        sell_date = pd.to_datetime(row.get("sell_date"), errors="coerce", dayfirst=True)

        # Parse prices
        buy_price = pd.to_numeric(row.get("buy_price", 0), errors="coerce") or 0
        sell_price = pd.to_numeric(row.get("sell_price", 0), errors="coerce") or 0

        # Parse P&L
        pnl_raw = row.get("pnl", 0)
        pnl = pd.to_numeric(pnl_raw, errors="coerce") or 0

        # Parse values (fallback: compute from price × quantity)
        buy_value = pd.to_numeric(row.get("buy_value", 0), errors="coerce")
        if pd.isna(buy_value) or buy_value == 0:
            buy_value = buy_price * quantity

        sell_value = pd.to_numeric(row.get("sell_value", 0), errors="coerce")
        if pd.isna(sell_value) or sell_value == 0:
            sell_value = sell_price * quantity

        # Calculate holding duration
        holding_minutes = np.nan
        if pd.notna(buy_date) and pd.notna(sell_date):
            delta = sell_date - buy_date
            holding_minutes = delta.total_seconds() / 60.0
            # If same-day (no time info), set a default intraday duration
            if holding_minutes == 0:
                holding_minutes = 390.0  # ~6.5 hours (typical trading session)

        # ── BUY trade ──
        trades.append({
            "symbol": symbol,
            "date": buy_date,
            "quantity": abs(quantity),
            "price": buy_price,
            "action": "buy",
            "pnl": 0.0,  # P&L is realized on sell
            "trade_value": abs(buy_value),
            "holding_duration_minutes": np.nan,
        })

        # ── SELL trade ──
        trades.append({
            "symbol": symbol,
            "date": sell_date,
            "quantity": abs(quantity),
            "price": sell_price,
            "action": "sell",
            "pnl": pnl,  # P&L is realized on the sell side
            "trade_value": abs(sell_value),
            "holding_duration_minutes": holding_minutes,
        })

    if not trades:
        raise FileParsingError(
            "No valid trade data found in the file. "
            "Please ensure the file contains columns like 'Stock name', 'Quantity', "
            "'Buy date', 'Buy price', 'Sell date', 'Sell price', and 'Realised P&L'."
        )

    result = pd.DataFrame(trades)

    # Sort chronologically
    result = result.sort_values("date", na_position="last").reset_index(drop=True)

    # Recalculate time differences (used by revenge trading detection)
    result["time_diff_minutes"] = result["date"].diff().dt.total_seconds() / 60.0

    logger.info(
        f"Parsed {len(result)} trade records from {len(df)} P&L rows "
        f"({result['symbol'].nunique()} unique symbols)"
    )

    return result


def parse_trading_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Main entry point: parse an uploaded trading file into a normalized DataFrame.

    Args:
        file_bytes: Raw bytes of the uploaded CSV/Excel file.
        filename: Original filename (used to detect format).

    Returns:
        DataFrame with columns: symbol, date, quantity, price, action, pnl,
        trade_value, holding_duration_minutes — ready for TradingAnalyzer.

    Raises:
        FileParsingError: If the file cannot be parsed or contains no valid data.
    """
    # Read raw file
    df_raw = _read_file(file_bytes, filename)
    logger.info(f"Read raw file: {len(df_raw)} rows, {len(df_raw.columns)} columns")

    # Normalize column names
    df_normalized = _normalize_columns(df_raw)

    # Validate minimum required columns exist
    required = ["symbol", "quantity"]
    missing = [col for col in required if col not in df_normalized.columns]
    if missing:
        raise FileParsingError(
            f"Missing required columns: {missing}. "
            f"Found columns: {list(df_normalized.columns)}"
        )

    # Ensure quantity is numeric
    df_normalized["quantity"] = pd.to_numeric(df_normalized["quantity"], errors="coerce").fillna(0.0)

    # Dynamically compute buy_price and sell_price if missing but values are present
    if "buy_price" not in df_normalized.columns and "buy_value" in df_normalized.columns:
        buy_val = pd.to_numeric(df_normalized["buy_value"], errors="coerce").fillna(0.0)
        df_normalized["buy_price"] = np.where(df_normalized["quantity"] > 0, buy_val / df_normalized["quantity"], 0.0)

    if "sell_price" not in df_normalized.columns and "sell_value" in df_normalized.columns:
        sell_val = pd.to_numeric(df_normalized["sell_value"], errors="coerce").fillna(0.0)
        df_normalized["sell_price"] = np.where(df_normalized["quantity"] > 0, sell_val / df_normalized["quantity"], 0.0)

    # Check for price columns
    has_buy_price = "buy_price" in df_normalized.columns
    has_sell_price = "sell_price" in df_normalized.columns
    if not has_buy_price and not has_sell_price:
        raise FileParsingError(
            "No price columns found. Expected 'Buy price' and/or 'Sell price'. "
            f"Found columns: {list(df_normalized.columns)}"
        )

    # Build individual trade records
    df_trades = _build_trade_rows(df_normalized)

    return df_trades
