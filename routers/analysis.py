"""
Analysis Router.
Handles file upload and trading psychology analysis endpoint.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from services.parser import parse_upload_file
from services.analyzer import TradingAnalyzer
from services.report_generator import generate_report
from models.schemas import AnalysisReport, ErrorResponse

import traceback


router = APIRouter(prefix="/api", tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=AnalysisReport,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file or data"},
        500: {"model": ErrorResponse, "description": "Internal analysis error"},
    },
    summary="Analyze Trading History",
    description=(
        "Upload a CSV or Excel file containing trading history. "
        "The system will analyze behavioral patterns and return a comprehensive "
        "trader psychology report including profile classification, behavioral risks, "
        "feature importance, loss analysis, and future risk predictions."
    ),
)
async def analyze_trading_history(
    file: UploadFile = File(
        ...,
        description="Trading history file (CSV or Excel). "
        "Required columns: date, symbol, action, quantity, price. "
        "Optional columns: pnl, holding_duration_minutes, entry_time, exit_time."
    ),
):
    """
    Analyze uploaded trading history and return a psychology report.

    **Required CSV/Excel columns:**
    - `date` — Trade date/timestamp
    - `symbol` — Ticker symbol (e.g., AAPL, NIFTY)
    - `action` — Buy or Sell
    - `quantity` — Number of shares/lots
    - `price` — Execution price

    **Optional columns (improve analysis accuracy):**
    - `pnl` — Profit/Loss for the trade
    - `holding_duration_minutes` — How long the position was held
    - `entry_time` — Entry timestamp
    - `exit_time` — Exit timestamp

    **Supported column aliases:** ticker, stock, instrument, side, qty, profit, p&l, etc.
    """
    try:
        # 1. Parse the uploaded file
        df, parse_metadata = await parse_upload_file(file)

        # 2. Validate minimum data requirements
        if len(df) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for analysis. Found {len(df)} valid trades, "
                       f"but at least 5 are required for meaningful analysis."
            )

        # 3. Run the analysis engine
        analyzer = TradingAnalyzer(df)
        analysis_result = analyzer.run_full_analysis()

        # 4. Generate the structured report
        report = generate_report(analysis_result)

        return report

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get(
    "/sample-columns",
    summary="Get Expected Column Format",
    description="Returns the expected column names for the trading history file.",
)
async def get_sample_columns():
    """Return the expected column format for reference."""
    return {
        "required_columns": ["date", "symbol", "action", "quantity", "price"],
        "optional_columns": ["pnl", "holding_duration_minutes", "entry_time", "exit_time"],
        "supported_aliases": {
            "symbol": ["ticker", "stock", "instrument"],
            "action": ["side", "type", "trade_type", "buy_sell"],
            "quantity": ["qty", "size", "volume", "lot_size"],
            "price": ["trade_price", "avg_price", "execution_price"],
            "pnl": ["profit", "profit_loss", "p&l", "pl", "realized_pnl", "net_pnl"],
            "date": ["trade_date", "timestamp", "datetime"],
        },
        "sample_row": {
            "date": "2024-01-15 09:30:00",
            "symbol": "AAPL",
            "action": "buy",
            "quantity": 100,
            "price": 185.50,
            "pnl": -250.00,
            "holding_duration_minutes": 45,
        },
    }
