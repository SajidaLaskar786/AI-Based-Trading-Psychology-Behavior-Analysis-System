"""
Trading Behavior Analysis API.
FastAPI application entry point.

Analyzes trading history to identify behavioral mistakes, explain possible
causes of losses, predict recurring behavioral risks, and generate a
trader psychology profile.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from routes.analysis import router as analysis_router
import logging

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Trading Behavior Analysis API",
    description=(
        "Analyzes trading history to identify behavioral mistakes, "
        "explain possible causes of losses, predict recurring behavioral risks, "
        "and generate a trader psychology profile.\n\n"
        "Upload a CSV or Excel file with your brokerage P&L statement to get "
        "a comprehensive behavioral analysis report."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Middleware ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(analysis_router)


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/docs")
