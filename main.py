"""
Trading Behavior Analysis API.
FastAPI application entry point.

Analyzes trading history to identify behavioral mistakes, explain possible
causes of losses, predict recurring behavioral risks, and generate a
trader psychology profile.
"""

import os
import logging
import threading
import pandas as pd
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from routes.analysis import router as analysis_router

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

# ─── Auth Database & Setup ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
USERS_EXCEL_PATH = os.path.join(ROOT_DIR, "data", "users.xlsx")
excel_lock = threading.Lock()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/v1/register")
def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    username_clean = req.username.strip()
    
    with excel_lock:
        os.makedirs(os.path.dirname(USERS_EXCEL_PATH), exist_ok=True)
        if os.path.exists(USERS_EXCEL_PATH):
            try:
                df = pd.read_excel(USERS_EXCEL_PATH)
            except Exception:
                df = pd.DataFrame(columns=["username", "email", "password"])
        else:
            df = pd.DataFrame(columns=["username", "email", "password"])
        
        # Check if email already registered
        if not df.empty and "email" in df.columns:
            existing_emails = df["email"].astype(str).str.strip().str.lower().values
            if email_clean in existing_emails:
                raise HTTPException(status_code=400, detail="Email is already registered.")
        
        new_row = pd.DataFrame([{"username": username_clean, "email": email_clean, "password": req.password}])
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel(USERS_EXCEL_PATH, index=False)
        
    return {"message": "Registration successful", "username": username_clean, "email": email_clean}

@app.post("/api/v1/login")
def login_user(req: LoginRequest):
    email_clean = req.email.strip().lower()
    
    with excel_lock:
        if not os.path.exists(USERS_EXCEL_PATH):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        try:
            df = pd.read_excel(USERS_EXCEL_PATH)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read user database.")
            
        if df.empty or "email" not in df.columns or "password" not in df.columns:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
            
        # Match email and password
        matched = df[
            (df["email"].astype(str).str.strip().str.lower() == email_clean) &
            (df["password"].astype(str) == req.password)
        ]
        
        if matched.empty:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
            
        user_row = matched.iloc[0]
        username = user_row["username"]
        email = user_row["email"]
        
    return {"username": username, "email": email}

# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(analysis_router)

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/docs")
