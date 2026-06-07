"""
Trading Psychology Analysis API.
FastAPI application entry point.
"""

import sys
from pathlib import Path

# Ensure the project root is on sys.path for local package imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analysis import router as analysis_router


# ─── App Configuration ───────────────────────────────────────────────────────

app = FastAPI(
    title="Trading Psychology Analysis API",
    description=(
        "Analyzes trading history to identify behavioral mistakes, "
        "explain possible causes of losses, predict recurring behavioral risks, "
        "and generate a comprehensive trader psychology profile."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS Middleware ──────────────────────────────────────────────────────────
# Allow frontend dashboard to communicate with the API

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(analysis_router)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Trading Psychology Analysis API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "service": "Trading Psychology Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "POST /api/analyze",
            "sample_columns": "GET /api/sample-columns",
            "docs": "GET /docs",
        },
    }
