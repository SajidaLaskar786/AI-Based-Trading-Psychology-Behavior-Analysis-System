# AI-Based Trading Psychology & Behavior Analysis System
## Complete Project Workflow & Summary

---

## 🧠 Project Overview

**TradePsych AI** is a full-stack intelligent web application that analyzes a trader's historical P&L data to detect psychological biases, classify behavioral profiles, predict future risks, and coach traders with actionable insights.

It operates in **two distinct modes**:

| Mode | Description |
|---|---|
| **Upload & Analyze** | Upload real brokerage P&L files (CSV/XLSX) → ML-powered report |
| **Live Simulation** | Trade virtual capital in a real-time market simulator → in-session behavioral profiling |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (Vite SPA)                        │
│  Welcome → Login/Signup → Dashboard → Report → Simulation          │
│  Tech: Vanilla JS, Chart.js, LightweightCharts, HTML/CSS           │
└──────────────┬──────────────────────────┬──────────────────────────┘
               │  /api/v1/*               │  /api/*
               ▼  (FastAPI:8000)          ▼  (Node.js:3000)
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│   Python Backend        │   │   Node.js Simulation Server          │
│   FastAPI + Uvicorn     │   │   Auth, Trading, Analytics APIs       │
│   routes/analysis.py    │   │   Groww API integration (optional)    │
└─────────────┬───────────┘   └──────────────────────────────────────┘
              │
   ┌──────────▼──────────────────────────────┐
   │          ML & Analytics Pipeline        │
   │  File Parser → Feature Eng → RF Model  │
   │  SHAP Explainer → Analyzer → Notifs    │
   └─────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Project/
├── app.py                        ← FastAPI entrypoint
├── routes/
│   └── analysis.py               ← Core /api/v1/analyze endpoint (497 lines)
├── services/
│   ├── file_parser.py            ← Brokerage file normalizer
│   ├── analyzer.py               ← Rule-based behavioral engine (701 lines)
│   ├── report_generator.py       ← Report structure builder
│   └── notifications.py          ← Real-time alert engine
├── models/
│   ├── schemas.py                ← Pydantic response models
│   ├── random_forest.pkl         ← Pre-trained Random Forest classifier
│   ├── kmeans_model.pkl          ← K-Means clustering model
│   └── scaler.pkl                ← Feature scaler
├── src/
│   ├── main.js                   ← SPA router
│   ├── pages/
│   │   ├── welcome.js            ← Landing page
│   │   ├── login.js / signup.js  ← Auth pages
│   │   ├── dashboard.js          ← File upload + analysis trigger
│   │   ├── report.js             ← Full analysis report viewer
│   │   └── simulation.js         ← Live trading simulator (~1700 lines)
│   ├── components/
│   │   ├── charts.js             ← Chart.js + LightweightCharts wrappers
│   │   └── particles.js          ← Animated background particles
│   ├── styles/                   ← Per-page CSS files
│   ├── feature_engineering/
│   │   └── generate_features.py  ← 19-feature extractor
│   └── utils/
│       ├── auth.js               ← Session helpers
│       ├── apiClient.js          ← Backend API wrapper
│       └── fileParser.js         ← Client-side CSV/XLSX preview parser
├── data/
│   ├── raw/                      ← Synthetic training data
│   └── processed/                ← Feature CSVs
├── requirements.txt              ← Python dependencies
└── vite.config.js                ← Dev proxy (API routing)
```

---

## 🔄 Full Analysis Pipeline (Upload Mode)

When a user uploads a P&L file, the system executes a **7-step pipeline**:

```
User uploads .csv/.xlsx/.xls file
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: File Validation & Ingestion                        │
│  • Extension check (.csv, .xlsx, .xls)                      │
│  • Size check (≤ 10 MB)                                     │
│  • Raw bytes → pandas DataFrame                             │
│  • Dynamic header detection (scans first 30 rows)           │
│  • Column aliasing (50+ column name variants supported)     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Data Normalization  (file_parser.py)               │
│  • Maps brokerage-specific column names → internal names    │
│  • Handles: "Realised P&L", "Buy Price", "Stock Name" etc.  │
│  • Each P&L row → split into BUY + SELL trade records       │
│  • Computes holding_duration_minutes, trade_value, PnL      │
│  • Sorts chronologically by date                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Feature Engineering  (generate_features.py)        │
│  Computes 19 behavioral & performance features per trader:  │
│                                                             │
│  Performance:    win_rate, avg_profit, avg_loss,            │
│                  profit_factor, avg_return_pct              │
│                                                             │
│  Behavior:       avg_holding_days, holding_variance,        │
│                  trades_per_month, avg_trades_per_day,      │
│                  max_loss_streak, max_win_streak            │
│                                                             │
│  Risk:           avg_position_size, position_size_variance, │
│                  risk_escalation_ratio, pnl_std             │
│                                                             │
│  Psychology:     post_loss_position_change,                 │
│                  post_loss_trade_delay                      │
│                                                             │
│  Overtrading:    avg_gap_between_trades,                    │
│                  same_day_trade_ratio                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: ML Model Prediction  (Random Forest)               │
│  • Loads pre-trained RandomForestClassifier (.pkl)          │
│  • Input: 19-feature vector (sanitized: inf/NaN → 0)        │
│  • Output: Trader Profile Type + Confidence %               │
│  • 5 possible classifications:                              │
│    ① Disciplined Trader                                     │
│    ② Emotional Trader                                       │
│    ③ Impulsive Trader (Overtrader)                          │
│    ④ Overconfident Trader                                   │
│    ⑤ Risk-Averse Trader                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: SHAP Explainability                                │
│  • TreeExplainer on Random Forest                           │
│  • Extracts per-feature SHAP values for predicted class     │
│  • Ranks top 5 behavioral drivers                           │
│  • Maps to human-readable names & explanations              │
│  • Fallback: uses RF feature_importances_ if SHAP fails     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Rule-Based Behavioral Analysis  (analyzer.py)      │
│  Runs 6 behavioral risk detectors — each returns score 0-100│
│                                                             │
│  🔴 Revenge Trading    — trades within 15 min of a loss    │
│  🟠 Overtrading        — daily trade count z-score > 1.5   │
│  🟡 Panic Exit         — short holds on losing trades      │
│  🟡 Emotional Trading  — high position size variance (CV)  │
│  🔵 Overconfidence     — size escalation after win streaks  │
│  🔵 FOMO               — entries >2% above price average   │
│                                                             │
│  → Loss Cause Analysis  ($ amount attributed per behavior) │
│  → Future Risk Prediction (trend: first vs second half)    │
│  → Summary Statistics   (win rate, P&L, streaks, etc.)     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Notification Engine + Report Assembly              │
│  • NotificationEngine scans last 30 days of round-trips     │
│  • Fires 4 alert types: overtrading, inconsistent_holding,  │
│    revenge_trading, loss_chasing                            │
│  • Severity: warning / critical                             │
│  • Final AnalysisReport assembled from all steps            │
│  • Temp files cleaned up, JSON returned to frontend         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Analysis Report Structure

The API returns a fully typed `AnalysisReport` Pydantic model:

```python
AnalysisReport {
  trader_profile:     TraderProfile          # type, confidence %, description
  behavioral_risks:   List[BehavioralRisk]   # name, score, level, description
  feature_importance: List[FeatureImportance]# top 5 SHAP drivers
  loss_analysis:      List[LossCause]        # cause, affected trades, $ loss, %
  future_risks:       List[FutureRisk]       # pattern, likelihood, recommendation
  summary_stats:      SummaryStats           # 12 aggregate trading statistics
  notifications:      List[Notification]     # real-time behavioral alerts
}
```

---

## 🎮 Live Trading Simulator (Simulation Mode)

The simulator is a fully self-contained SPA section with its own Node.js backend:

### Simulator Architecture

```
Frontend (simulation.js ~1700 lines)
     │
     ├── Auth Screen       → Username-based session (₹10,00,000 virtual capital)
     ├── View 1: Live Simulator
     │     ├── Market Selector (NSE / NASDAQ / Crypto)
     │     ├── Stock List Table (real-time price ticks)
     │     ├── Candlestick Chart (LightweightCharts)
     │     └── Order Execution Panel (BUY/SELL)
     │
     ├── View 2: Portfolio & Orders
     │     ├── Open Positions (live unrealized P&L)
     │     └── Closed Trades (realized P&L log)
     │
     ├── View 3: Behavioral Analytics (19 live metrics)
     │     ├── Performance:   Win Rate, Profit Factor, Avg Return
     │     ├── Holding:       Avg Duration, Variance, Same-Day Ratio
     │     ├── Activity:      Trades/Month, Trades/Day, Trade Gap
     │     ├── Risk:          Avg Size, Size Variance, Escalation Ratio
     │     └── Emotional:     Post-Loss Size Shift, Cool-down Delay, PnL Std, Streaks
     │
     └── View 4: Psychology Report (on-demand)
           ├── Behavioral Dimension Scores (Discipline, Emotional, Risk, Consistency)
           ├── Top 5 Behavioral Drivers
           ├── Strengths & Blindspots
           ├── Coaching Recommendations
           └── Detailed Metrics Table
```

### Simulation Time Compression

> **1 simulation day = 30 real-world seconds**
>
> This means a full trading month (30 days) completes in **15 real minutes**, allowing rapid behavioral pattern generation.

### Optional Groww API Integration

The simulator supports an optional **Groww API token** for live market data. Without it, it falls back to generated simulation data.

---

## 🛠️ Technology Stack

### Backend

| Component | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Data Processing | Pandas, NumPy |
| ML Model | scikit-learn RandomForestClassifier |
| Explainability | SHAP (TreeExplainer) |
| File Parsing | openpyxl (Excel), built-in CSV |
| Model Persistence | joblib (.pkl files) |

### Frontend

| Component | Technology |
|---|---|
| Build Tool | Vite (with HMR) |
| Language | Vanilla JavaScript (ES Modules) |
| Charting | Chart.js, LightweightCharts |
| Styling | Vanilla CSS (dark glassmorphism theme) |
| Routing | Hash-based SPA router |

### Dev Environment

| Component | Technology |
|---|---|
| Python Runtime | Python 3.13 (Anaconda) |
| Node Runtime | Node.js (npm) |
| Proxy | Vite dev proxy → FastAPI:8000 & Node:3000 |
| Tunnel | Cloudflare Tunnel (for external access) |

---

## 🔌 API Endpoints

### FastAPI Backend — `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/health` | Detailed health status |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/api/v1/health` | API health check |
| `POST` | `/api/v1/analyze` | **Core** — Upload file, returns full `AnalysisReport` |

### Node.js Simulation Server — `http://localhost:3000`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login / create session |
| `GET` | `/api/auth/session/:username` | Load existing session |
| `GET` | `/api/market/status` | Market open/close status |
| `GET` | `/api/market/history/:symbol` | OHLCV candlestick data |
| `POST` | `/api/trade/buy` | Execute buy order |
| `POST` | `/api/trade/sell` | Execute sell order |
| `GET` | `/api/trade/portfolio/:username` | Portfolio + closed trades |
| `GET` | `/api/analytics/features/:username` | 19 computed behavioral features |
| `POST` | `/api/analytics/report` | Generate psychology report from sim trades |

---

## 🧮 Behavioral Risk Algorithms

### 1. Revenge Trading Detector
- Window: trades placed within **15 minutes** of a loss
- Minimum threshold: **3+ revenge trades** to flag
- Score formula: `min(100, revenge_ratio × 200 + (count ≥ 3) × 20)`

### 2. Overtrading Detector
- Uses **z-score** of daily trade counts (threshold: 1.5σ)
- Minimum threshold: **5+ trades/day** to flag
- Score combines: overtrading day ratio + avg daily count + max daily spike

### 3. Panic Exit Detector
- Identifies short holds in bottom **20th percentile** of holding times
- Also flags winning trades below **50% of average win size**
- Score formula: `min(100, panic_ratio × 150)`

### 4. Emotional Trading Detector
- Coefficient of Variation (CV) of position sizes; threshold: **0.6**
- Also detects position size increases (>20%) after each loss
- Score formula: `(CV > 0.6) × 30 + CV × 40 + emotional_ratio × 100`

### 5. Overconfidence Detector
- Checks 2+ consecutive wins → next trade size increase > **1.3×**
- Tracks `max_size_increase_ratio` across all win streaks

### 6. FOMO Detector
- Compares buy price to 5-trade rolling average price per symbol
- Flags buys **>2% above the rolling average** as FOMO entries
- Score formula: `min(100, fomo_ratio × 150)`

---

## 📐 Column Aliasing System

The file parser supports **50+ brokerage column name variants** across NSE, BSE, and international formats:

| Internal Field | Accepted Aliases |
|---|---|
| `symbol` | Stock name, scrip, instrument, ticker, asset… |
| `quantity` | qty, trade qty, volume, size, shares, lots |
| `buy_date` | purchase date, entry date, trade_date, dt… |
| `pnl` | Realised P&L, P&L, profit/loss, net P&L, gain/loss… |
| `buy_price` | entry price, avg buy price, open_price… |

---

## 🎯 Trader Profile Classification

The ML model classifies traders into one of 5 profiles. The rule-based system also provides a fallback via a **weighted scoring algorithm**:

| Profile | Key Drivers | Behavioral Markers |
|---|---|---|
| 🟢 **Disciplined Trader** | Low emotional & revenge scores | Consistent sizing, calm cooldown, stable holds |
| 🔴 **Emotional Trader** | High revenge + emotional scores | Impulsive post-loss entries, erratic sizing |
| 🟠 **Impulsive Trader** | High overtrading + FOMO | Excessive trades, chasing, rapid re-entry |
| 🟡 **Overconfident Trader** | High overconfidence score | Aggressive sizing after winning streaks |
| 🔵 **Risk-Averse Trader** | High panic exit score | Cutting winners short, early exits |

---

## 📦 Data Flow Summary

```
📂 User File (CSV / XLSX)
       │
       ├──► File Parser           → Normalized trade records (BUY/SELL rows)
       │                                     │
       ├──► Round-Trip Builder    → Paired trade DataFrame (buy_date, sell_date)
       │                                     │
       │                             Feature Generator
       │                                     │
       │                          19 behavioral features
       │                                     │
       │              ┌──────────────────────┤
       │              │                      │
       │         RF Model              Rule-Based Analyzer
       │              │                      │
       │    Profile + Confidence     Risk Scores + Loss Causes
       │              │                      │
       │         SHAP Values          Future Risk Predictions
       │              │                      │
       └──────────────▼──────────────────────▼──────────┐
                                                         │
                                          Notification Engine
                                                         │
                                       AnalysisReport (JSON)
                                                         │
                                      Frontend Report Page
                                    (Charts + Cards + Advice)
```

---

## 🚀 Running the Project

```bash
# Start everything (frontend + both backends)
npm run dev:all

# Or start individually:
uvicorn app:app --reload        # FastAPI on :8000
node src/services/main.js       # Node.js simulation server on :3000
npm run dev                     # Vite frontend on :5173
```

> The Vite dev proxy automatically routes `/api/v1/*` → FastAPI and `/api/*` → Node.js,
> so the frontend only ever talks to `:5173`.

---

## 📋 Supported Input File Formats

| Format | Notes |
|---|---|
| `.csv` | UTF-8, Latin-1, CP1252 encodings auto-detected |
| `.xlsx` | Excel 2007+, openpyxl engine |
| `.xls` | Legacy Excel format |
| Max size | 10 MB |
| Auto-detect | Skips metadata rows; dynamically finds the actual header row |

The parser handles real brokerage statements from **Zerodha, Groww, Upstox, and other NSE/BSE brokers**,
which often include multiple metadata rows before the actual trade data.

---

*Document generated: 2026-06-26 | Project: AI-Based Trading Psychology & Behavior Analysis System*
