
// Simulation Page
export function render() {
  return `
    <div class="simulation-page-wrapper" style="height: 100vh; overflow-y: auto;">
      <!-- Animated Background Layer -->
  <div class="animated-bg">
    <div class="gradient-blob blob-1"></div>
    <div class="gradient-blob blob-2"></div>
    <div class="gradient-blob blob-3"></div>
  </div>

  <!-- Global Notification Toast -->
  <div id="toast" class="toast hidden"></div>

  <!-- AUTH SCREEN -->
  <div id="auth-screen" class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo"><i class="fa-solid fa-brain"></i></div>
        <h1>Trader Psychology Lab</h1>
        <p>Simulation-driven behavioral profiling and AI-powered diagnostic reporting.</p>
      </div>
      
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label for="username-input">Enter Username</label>
          <div class="input-wrapper">
            <i class="fa-solid fa-user"></i>
            <input type="text" id="username-input" placeholder="e.g. market_wizard" required autocomplete="off">
          </div>
        </div>
        <button type="submit" id="login-submit-btn" class="btn btn-primary btn-block">
          Begin Session <i class="fa-solid fa-chevron-right ml-2"></i>
        </button>
      </form>
      <div class="auth-footer">
        <p>Access ₹10,00,000 in virtual capital instantly. Session data is persisted automatically.</p>
      </div>
    </div>
  </div>

  <!-- DASHBOARD WRAPPER (HIDDEN BY DEFAULT) -->
  <div id="main-dashboard" class="dashboard-wrapper hidden">
    
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <i class="fa-solid fa-brain brand-icon"></i>
        <span>Psychology Lab</span>
      </div>

      <div class="user-profile">
        <div class="avatar"><i class="fa-solid fa-circle-user"></i></div>
        <div class="user-info">
          <h4 id="user-display-name">Username</h4>
          <span class="user-role">Trader Trainee</span>
        </div>
      </div>

      <!-- Live Clock & Equity -->
      <div class="sim-clock-card">
        <div class="clock-label"><i class="fa-regular fa-clock"></i> Simulation Time</div>
        <div id="sim-time-display" class="clock-time">-- : -- : --</div>
        <div class="clock-label mt-3"><i class="fa-solid fa-wallet"></i> Net Equity Valuation</div>
        <div id="equity-display" class="equity-amount">₹10,00,000.00</div>
        <div id="cash-balance-display" class="cash-amount">Cash: ₹10,00,000.00</div>
      </div>

      <!-- Groww API Token Configuration -->
      <div class="groww-token-card mt-3">
        <div class="clock-label"><i class="fa-solid fa-key"></i> Groww API Access Token</div>
        <div class="token-input-wrapper mt-2">
          <input type="password" id="groww-token-input" placeholder="Enter Groww Token..." autocomplete="off">
          <button id="save-groww-token-btn" class="btn btn-primary" title="Save Token"><i class="fa-solid fa-check"></i></button>
        </div>
        <div id="groww-token-status" class="token-status text-muted mt-1" style="font-size: 0.7rem; display: flex; align-items: center; gap: 4px;">
          <i class="fa-solid fa-circle-info"></i> No token saved. Using sim data.
        </div>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li>
            <a href="#" class="nav-link active" id="nav-trading" data-view="view-trading">
              <i class="fa-solid fa-chart-line"></i> Live Simulator
            </a>
          </li>
          <li>
            <a href="#" class="nav-link" id="nav-portfolio" data-view="view-portfolio">
              <i class="fa-solid fa-briefcase"></i> Portfolio & Orders
            </a>
          </li>
          <li>
            <a href="#" class="nav-link" id="nav-analytics" data-view="view-analytics">
              <i class="fa-solid fa-chart-bar"></i> Behavioral Stats
            </a>
          </li>
          <li>
            <a href="#" class="nav-link" id="nav-report" data-view="view-report">
              <i class="fa-solid fa-file-invoice"></i> Psychology Report
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <button id="logout-btn" class="btn btn-outline btn-block">
          <i class="fa-solid fa-right-from-bracket mr-2"></i> End Session
        </button>
      </div>
    </aside>

    <!-- CONTENT AREA -->
    <main class="content-area">
      
      <!-- VIEW 1: TRADING VIEW -->
      <section id="view-trading" class="dashboard-view active">
        <div class="view-header">
          <h2>Live Market Trading</h2>
          <p>Execute virtual trades across global markets. 1 day matches 30 seconds real time.</p>
        </div>

        <div class="trading-grid">
          <!-- Market & Stock List (Left Column) -->
          <div class="grid-card stock-selector-card">
            <div class="market-selector">
              <button class="market-btn active" data-market="NSE">NSE</button>
              <button class="market-btn" data-market="NASDAQ">NASDAQ</button>
              <button class="market-btn" data-market="CRYPTO">Crypto</button>
            </div>
            <div class="stock-list-container">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Change</th>
                  </tr>
                </thead>
                <tbody id="stock-list-body">
                  <!-- Injected by JS -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart & Symbol Info (Center Column) -->
          <div class="grid-card chart-card">
            <div class="chart-header">
              <div class="symbol-info">
                <span id="active-symbol" class="symbol-badge">SYMBOL</span>
                <div>
                  <h3 id="active-symbol-name">Stock Name</h3>
                  <span id="active-symbol-market" class="market-label">NSE</span>
                </div>
              </div>
              <div class="price-quote">
                <div id="active-symbol-price" class="quote-price">₹0.00</div>
                <div id="active-symbol-change" class="quote-change positive">+0.00%</div>
              </div>
            </div>
            <!-- Candlestick chart div -->
            <div id="tv-chart-container" class="chart-container-div"></div>
          </div>

          <!-- Order Form & Positions (Right Column) -->
          <div class="grid-card order-execution-card">
            <h3>Execute Order</h3>
            <div class="order-type-tabs">
              <button class="order-tab active" id="order-tab-buy">BUY</button>
            </div>

            <div class="order-form-body">
              <div class="form-group">
                <label>Buying Power</label>
                <div id="buying-power-display" class="stat-value small">₹10,00,000.00</div>
              </div>
              <div class="form-group">
                <label for="order-quantity">Quantity</label>
                <div class="qty-input-wrapper">
                  <input type="number" id="order-quantity" value="10" min="1" step="1">
                  <span class="qty-unit">Shares</span>
                </div>
              </div>
              <div class="order-summary-box">
                <div class="summary-row">
                  <span>Price per Share</span>
                  <span id="order-price-est">₹0.00</span>
                </div>
                <div class="summary-row total">
                  <span>Estimated Total</span>
                  <span id="order-total-est">₹0.00</span>
                </div>
              </div>
              
              <button id="execute-order-btn" class="btn btn-success btn-block mt-4">
                Execute Buy Order
              </button>
            </div>

            <!-- Active Position for this stock -->
            <div class="stock-active-positions mt-4">
              <h4>Open Positions in <span id="positions-active-symbol">...</span></h4>
              <div id="stock-positions-list" class="mini-positions-container">
                <!-- Injected by JS -->
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 2: PORTFOLIO & ORDERS -->
      <section id="view-portfolio" class="dashboard-view">
        <div class="view-header">
          <h2>Portfolio & Execution Logs</h2>
          <p>Review open exposure, current valuations, and complete session transaction logs.</p>
        </div>

        <!-- Metric Summary Cards -->
        <div class="portfolio-metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Account Balance</div>
            <div id="port-cash-balance" class="metric-val">₹10,00,000.00</div>
            <div class="metric-desc">Available cash for new trades.</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Active Exposure Value</div>
            <div id="port-exposure" class="metric-val">₹0.00</div>
            <div class="metric-desc">Current valuation of open positions.</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Realized Returns</div>
            <div id="port-realized-pnl" class="metric-val">₹0.00</div>
            <div id="port-realized-pnl-pct" class="metric-desc positive">+0.00%</div>
          </div>
          <div class="metric-card highlight">
            <div class="metric-label">Net Return on Capital</div>
            <div id="port-net-return" class="metric-val">₹0.00</div>
            <div id="port-net-return-pct" class="metric-desc positive">+0.00%</div>
          </div>
        </div>

        <!-- Open Positions Section -->
        <div class="grid-card mt-4">
          <div class="section-title">
            <h3><i class="fa-solid fa-folder-open text-primary mr-2"></i> Open Positions</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Entry Price</th>
                  <th class="text-right">Current Price</th>
                  <th class="text-right">Entry Value</th>
                  <th class="text-right">Current Value</th>
                  <th class="text-right">Unrealized P&L</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody id="open-positions-tbody">
                <tr>
                  <td colspan="8" class="text-center text-muted py-4">No open positions in this session.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Closed Positions Section -->
        <div class="grid-card mt-4">
          <div class="section-title">
            <h3><i class="fa-solid fa-circle-check text-success mr-2"></i> Closed Trades</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Entry Price</th>
                  <th class="text-right">Exit Price</th>
                  <th class="text-right">Buy Value</th>
                  <th class="text-right">Sell Value</th>
                  <th class="text-right">Realized P&L</th>
                  <th>Entry Date (Sim)</th>
                  <th>Exit Date (Sim)</th>
                </tr>
              </thead>
              <tbody id="closed-positions-tbody">
                <tr>
                  <td colspan="9" class="text-center text-muted py-4">No completed trades recorded in this session.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 3: BEHAVIORAL STATS -->
      <section id="view-analytics" class="dashboard-view">
        <div class="view-header">
          <h2>Behavioral Analytics Layer</h2>
          <p>Real-time calculation of 19 distinct trade habits, risk vectors, and emotional cues.</p>
        </div>

        <!-- Feature Category: Performance -->
        <div class="analytics-section">
          <h3><i class="fa-solid fa-ranking-star text-info mr-2"></i> Performance Indicators</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feat-name">Win Rate</div>
              <div id="feat-win_rate" class="feat-value">0.00%</div>
              <div class="feat-bar-bg"><div id="bar-win_rate" class="feat-bar" style="width: 0%"></div></div>
              <div class="feat-desc">Percentage of completed trades that closed in positive profit. Benchmark: 55%.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Profit Factor</div>
              <div id="feat-profit_factor" class="feat-value">0.00</div>
              <div class="feat-bar-bg"><div id="bar-profit_factor" class="feat-bar" style="width: 0%"></div></div>
              <div class="feat-desc">Ratio of Gross Profits divided by Gross Losses. A value above 1.5 shows profit health.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Average Return Per Trade</div>
              <div id="feat-avg_return_pct" class="feat-value">0.00%</div>
              <div class="feat-desc">The mathematical mean of percentage returns across all closed positions.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Average Win vs Loss Size</div>
              <div id="feat-avg_win_loss" class="feat-value">₹0 / ₹0</div>
              <div class="feat-desc">Compares the average winning trade size with the average losing trade size (avg_profit vs avg_loss).</div>
            </div>
          </div>
        </div>

        <!-- Feature Category: Holding Behavior -->
        <div class="analytics-section mt-4">
          <h3><i class="fa-solid fa-hourglass-half text-warning mr-2"></i> Holding Mechanics</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feat-name">Average Holding Duration</div>
              <div id="feat-avg_holding_days" class="feat-value">0.0000 days</div>
              <div class="feat-desc">Mean holding duration (buy to sell) tracked in simulation calendar days (30 seconds = 1 day).</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Holding Period Variance</div>
              <div id="feat-holding_variance" class="feat-value">0.0000</div>
              <div class="feat-desc">Standard deviation of holding times. Low variance demonstrates consistent trade exit plans.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Same-Day Close Ratio</div>
              <div id="feat-same_day_trade_ratio" class="feat-value">0.00%</div>
              <div class="feat-bar-bg"><div id="bar-same_day_trade_ratio" class="feat-bar" style="width: 0%"></div></div>
              <div class="feat-desc">Percentage of trades opened and closed within the same simulation calendar day (day-trading concentration).</div>
            </div>
          </div>
        </div>

        <!-- Feature Category: Activity Level -->
        <div class="analytics-section mt-4">
          <h3><i class="fa-solid fa-sliders text-success mr-2"></i> Activity Indicators</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feat-name">Trades Per Sim Month</div>
              <div id="feat-trades_per_month" class="feat-value">0.0</div>
              <div class="feat-desc">Frequency of transactions scaled to a simulation calendar month (30 days = 15 real minutes).</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Average Trades Per Sim Day</div>
              <div id="feat-avg_trades_per_day" class="feat-value">0.0</div>
              <div class="feat-desc">Average trade volume executed per simulation day. High averages signify high frequency scalp habits.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Average Inter-Trade Gap</div>
              <div id="feat-avg_gap_between_trades" class="feat-value">0.0000 days</div>
              <div class="feat-desc">Average duration elapsed from closing one trade to opening the next. Low gaps indicate rush entries.</div>
            </div>
          </div>
        </div>

        <!-- Feature Category: Risk Management -->
        <div class="analytics-section mt-4">
          <h3><i class="fa-solid fa-shield-halved text-primary mr-2"></i> Risk Management Profile</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feat-name">Average Position Size</div>
              <div id="feat-avg_position_size" class="feat-value">₹0.00</div>
              <div class="feat-desc">Mean capital allocation (buy value) per trade. Benchmarked against account purchasing power.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Position Size Variance</div>
              <div id="feat-position_size_variance" class="feat-value">₹0.00</div>
              <div class="feat-desc">Standard deviation of position sizing. Low variance shows adherence to strict sizing standards.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Risk Escalation Ratio</div>
              <div id="feat-risk_escalation_ratio" class="feat-value">1.00</div>
              <div class="feat-desc">Average size of trades after wins divided by average size after losses. Ratios above 1.5 show leverage greed.</div>
            </div>
          </div>
        </div>

        <!-- Feature Category: Emotional Response -->
        <div class="analytics-section mt-4">
          <h3><i class="fa-solid fa-heart-pulse text-danger mr-2"></i> Emotional Response Cues</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feat-name">Post-Loss Size Shift</div>
              <div id="feat-post_loss_position_change" class="feat-value">0.00%</div>
              <div class="feat-desc">Percentage change in position size on trades entered immediately after a loss. Large increases indicate revenge trading.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Post-Loss Cool-down Delay</div>
              <div id="feat-post_loss_trade_delay" class="feat-value">0.0000 days</div>
              <div class="feat-desc">Time elapsed before entering a new trade after closing out a loss. Short delays reveal reactive impulse.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">PnL Outcome Volatility (Std)</div>
              <div id="feat-pnl_std" class="feat-value">₹0.00</div>
              <div class="feat-desc">Standard deviation of realized profits/losses. Measures the stability and swings of absolute trade outcomes.</div>
            </div>
            <div class="feature-card">
              <div class="feat-name">Max Win / Loss Streaks</div>
              <div id="feat-streaks" class="feat-value">0 wins / 0 losses</div>
              <div class="feat-desc">Longest run of consecutive wins and consecutive losses. Extended loss streaks test emotional discipline.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 4: PSYCHOLOGY REPORT -->
      <section id="view-report" class="dashboard-view">
        <div class="view-header">
          <h2>Trader Psychology Diagnostics</h2>
          <p>Request an AI-driven, interpretable behavioral diagnostic report based on your live session trade patterns.</p>
        </div>

        <div class="report-controls-card">
          <button id="generate-report-btn" class="btn btn-primary btn-large">
            <i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Psychology Diagnostics Report
          </button>
          <span class="report-status-desc">Generates instantly under 5 seconds. Analyzes all 19 metrics.</span>
        </div>

        <!-- REPORT VIEW AREA (HIDDEN UNTIL GENERATED) -->
        <div id="report-view-container" class="report-view-layout hidden">
          
          <div class="grid-card report-header-block">
            <div class="report-title-row">
              <div>
                <span class="diagnostics-tag">🧠 Psychological Diagnostics</span>
                <h1>Trader Profile Analysis 📊</h1>
                <p id="report-date" class="text-muted">Generated: --</p>
              </div>
              <div class="report-overall-score" style="width: 180px; height: 180px; position: relative;">
                <canvas id="simMultiVariChart"></canvas>
              </div>
            </div>

            <div class="classification-strip mt-4">
              <div class="strip-label">Trader Classification Type:</div>
              <div id="report-trader-type" class="classification-val">Disciplined Trader</div>
            </div>

            <div class="report-summary-box mt-4">
              <h4>Behavioral Analysis Profile 🕵️‍♂️</h4>
              <p id="report-summary-text">Execute trades in the simulator to generate your psychological profile report. This summary will explain your patterns.</p>
            </div>
          </div>

          <div class="report-sub-grid mt-4">
            
            <!-- Left Column: Scores & Drivers -->
            <div class="report-column-left">
              <!-- Score breakdown -->
              <div class="grid-card">
                <h3>Behavioral Dimension Scores</h3>
                
                <div class="score-breakdown-row">
                  <div class="score-title">
                    <span>Discipline Score</span>
                    <span id="score-discipline">0/100</span>
                  </div>
                  <div class="progress-bar-bg"><div id="score-bar-discipline" class="progress-bar" style="width: 0%"></div></div>
                  <p class="score-desc">Measures position size consistency, holding period variance, and trading volume limits.</p>
                </div>

                <div class="score-breakdown-row mt-3">
                  <div class="score-title">
                    <span>Emotional Stability</span>
                    <span id="score-emotional">0/100</span>
                  </div>
                  <div class="progress-bar-bg"><div id="score-bar-emotional" class="progress-bar emotional" style="width: 0%"></div></div>
                  <p class="score-desc">Evaluates post-loss behavior, sizing changes after losses, and cool-down breaks.</p>
                </div>

                <div class="score-breakdown-row mt-3">
                  <div class="score-title">
                    <span>Risk Management</span>
                    <span id="score-risk">0/100</span>
                  </div>
                  <div class="progress-bar-bg"><div id="score-bar-risk" class="progress-bar risk" style="width: 0%"></div></div>
                  <p class="score-desc">Based on average position size limits, sizing variance, and win/loss size scaling ratios.</p>
                </div>

                <div class="score-breakdown-row mt-3">
                  <div class="score-title">
                    <span>Consistency Score</span>
                    <span id="score-consistency">0/100</span>
                  </div>
                  <div class="progress-bar-bg"><div id="score-bar-consistency" class="progress-bar consistency" style="width: 0%"></div></div>
                  <p class="score-desc">Monitors holding consistency, win/loss streak balancing, and trade gaps.</p>
                </div>
              </div>

              <!-- Top Drivers -->
              <div class="grid-card mt-4">
                <h3>Top 5 Behavioral Drivers</h3>
                <p class="text-muted small mb-3">These 5 metrics deviated the most from standard professional benchmarks, shaping your classification:</p>
                <ol id="report-drivers-list" class="drivers-ordered-list">
                  <!-- Injected by JS -->
                </ol>
              </div>
            </div>

            <!-- Right Column: Strengths, Weaknesses & Recommendations -->
            <div class="report-column-right">
              
              <!-- Strengths -->
              <div class="grid-card strengths-card">
                <h3><i class="fa-solid fa-circle-check text-success mr-2"></i> Behavioral Strengths</h3>
                <div id="report-strengths-container" class="sw-list">
                  <!-- Injected by JS -->
                </div>
              </div>

              <!-- Weaknesses -->
              <div class="grid-card weaknesses-card mt-4">
                <h3><i class="fa-solid fa-triangle-exclamation text-danger mr-2"></i> Behavioral Blindspots</h3>
                <div id="report-weaknesses-container" class="sw-list">
                  <!-- Injected by JS -->
                </div>
              </div>

              <!-- Recommendations -->
              <div class="grid-card recommendations-card mt-4">
                <h3><i class="fa-solid fa-lightbulb text-warning mr-2"></i> Actionable Coaching Recommendations</h3>
                <ul id="report-recommendations-list" class="recommendations-checklist">
                  <!-- Injected by JS -->
                </ul>
              </div>

            </div>

          </div>

          <!-- Bottom detailed table -->
          <div class="grid-card mt-4">
            <h3>Detailed Behavioral Metrics</h3>
            <div class="table-responsive">
              <table class="report-metrics-table">
                <thead>
                  <tr>
                    <th>Psychology Vector</th>
                    <th>Measured Metric</th>
                    <th>Ideal Target Baseline</th>
                    <th>Result Category</th>
                  </tr>
                </thead>
                <tbody id="report-metrics-tbody">
                  <!-- Injected by JS -->
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

    </main>

  </div>
    </div>
  `;
}

// public/js/api.js
const API = {
  // Authentication & Session
  async login(username) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async getSession(username) {
    const res = await fetch(`/api/auth/session/${username}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to retrieve session');
    }
    return res.json();
  },

  // Market Data
  async getMarketStatus() {
    const headers = {};
    const token = localStorage.getItem('groww_token');
    if (token) headers['x-groww-token'] = token;

    const res = await fetch('/api/market/status', { headers });
    if (!res.ok) throw new Error('Failed to fetch market status');
    return res.json();
  },

  async getStockHistory(symbol) {
    const headers = {};
    const token = localStorage.getItem('groww_token');
    if (token) headers['x-groww-token'] = token;

    const res = await fetch(`/api/market/history/${symbol}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}`);
    return res.json();
  },

  // Trading Actions
  async buyStock(username, market, symbol, quantity) {
    const res = await fetch('/api/trade/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, market, symbol, quantity })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Buy order failed');
    }
    return res.json();
  },

  async sellStock(username, tradeId) {
    const res = await fetch('/api/trade/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, tradeId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Sell order failed');
    }
    return res.json();
  },

  async getPortfolio(username) {
    const res = await fetch(`/api/trade/portfolio/${username}`);
    if (!res.ok) throw new Error('Failed to fetch portfolio data');
    return res.json();
  },

  // Analytics & Psychology Model
  async getBehavioralFeatures(username) {
    const res = await fetch(`/api/analytics/features/${username}`);
    if (!res.ok) throw new Error('Failed to fetch features');
    return res.json();
  },

  async generatePsychologyReport(username) {
    const res = await fetch('/api/analytics/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate psychology report');
    }
    return res.json();
  },

  async getReportsList(username) {
    const res = await fetch(`/api/analytics/reports/${username}`);
    if (!res.ok) throw new Error('Failed to retrieve reports list');
    return res.json();
  }
};


// public/js/app.js

// Global State
let currentUser = null;
let activeMarket = 'NSE';
let activeSymbol = 'RELIANCE';
let activeChart = null;
let candlestickSeries = null;
let pollIntervalId = null;
let lastPrices = {}; // Keep track of previous prices to flash green/red
let activeSymbolLastDate = null;

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `toast ${type}`;
  
  // Clear any existing timeout
  if (toast.timeoutId) clearTimeout(toast.timeoutId);

  toast.timeoutId = setTimeout(() => {
    toast.className = 'toast hidden';
  }, 4000);
}

// App Initialization
export function mount() {
  setupEventListeners();
  checkSession();
}

export function unmount() {
  stopPolling();
  if (activeChart) {
    activeChart.remove();
    activeChart = null;
    candlestickSeries = null;
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    if (!username) return;

    try {
      const user = await API.login(username);
      currentUser = user.username;
      
      // Save session in local storage for refresh persistence
      localStorage.setItem('trader_session', currentUser);
      
      showToast(`Welcome back, ${user.username}! Session loaded with ₹${user.balance.toLocaleString()}`, 'success');
      enterDashboard(user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Navigation Links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      
      // Switch active class
      navLinks.forEach(nl => nl.classList.remove('active'));
      link.classList.add('active');

      // Switch view panel
      const views = document.querySelectorAll('.dashboard-view');
      views.forEach(v => {
        if (v.id === targetView) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
      });

      // Trigger specific view loads
      if (targetView === 'view-analytics') {
        refreshBehavioralFeatures();
      }
    });
  });

  // Market Select buttons
  const marketBtns = document.querySelectorAll('.market-btn');
  marketBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      marketBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      activeMarket = btn.getAttribute('data-market');
      renderStockList();
    });
  });

  // Order Quantity Event
  const qtyInput = document.getElementById('order-quantity');
  qtyInput.addEventListener('input', updateOrderEstimates);

  // Execute Order Button
  const executeBtn = document.getElementById('execute-order-btn');
  executeBtn.addEventListener('click', async () => {
    const qty = parseInt(qtyInput.value);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid positive quantity', 'error');
      return;
    }

    executeBtn.disabled = true;
    try {
      const res = await API.buyStock(currentUser, activeMarket, activeSymbol, qty);
      showToast(res.message, 'success');
      updatePortfolioUI();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      executeBtn.disabled = false;
    }
  });

  // Generate Report Button
  const genReportBtn = document.getElementById('generate-report-btn');
  if (genReportBtn) {
    genReportBtn.addEventListener('click', async () => {
      genReportBtn.disabled = true;
      genReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing Behavior Model...';
      
      try {
        const data = await API.getPortfolio(currentUser);
        const closedTrades = data.closedPositions || [];
        if (closedTrades.length === 0) {
          throw new Error('No closed trades available to analyze. Please execute and close some trades first.');
        }
        
        let csv = "symbol,quantity,buy_date,sell_date,buy_price,sell_price\n";
        closedTrades.forEach(p => {
          // Normalize dates slightly to avoid parsing issues if needed, but the backend accepts standard ISO
          csv += `${p.symbol},${p.quantity},${p.buyDate},${p.sellDate},${p.buyPrice},${p.sellPrice}\n`;
        });
        
        const formData = new FormData();
        const blob = new Blob([csv], { type: 'text/csv' });
        formData.append('file', blob, 'trades.csv');
        
        const res = await fetch('/api/v1/analyze', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to generate psychology report from ML backend');
        }
        const report = await res.json();
        
        showToast('Trader psychology report compiled successfully using ML backend!', 'success');
        renderPsychologyReport(report);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        genReportBtn.disabled = false;
        genReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Psychology Diagnostics Report';
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('trader_session');
    exitDashboard();
  });

  // Groww token UI event listeners
  const saveGrowwTokenBtn = document.getElementById('save-groww-token-btn');
  const growwTokenInput = document.getElementById('groww-token-input');
  
  if (saveGrowwTokenBtn && growwTokenInput) {
    saveGrowwTokenBtn.addEventListener('click', () => {
      const token = growwTokenInput.value.trim();
      if (!token) {
        localStorage.removeItem('groww_token');
        showToast('Groww access token cleared.', 'info');
      } else {
        localStorage.setItem('groww_token', token);
        showToast('Groww access token saved successfully!', 'success');
      }
      updateGrowwTokenStatus();
      // Reload stock lists and chart with the new token
      renderStockList();
    });
  }
}

function updateGrowwTokenStatus() {
  const growwTokenInput = document.getElementById('groww-token-input');
  const growwTokenStatus = document.getElementById('groww-token-status');
  if (!growwTokenInput || !growwTokenStatus) return;

  const savedToken = localStorage.getItem('groww_token');
  if (savedToken) {
    growwTokenInput.value = savedToken;
    growwTokenStatus.innerHTML = `<span style="color: var(--color-success); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-circle-check"></i> Groww API active</span>`;
  } else {
    growwTokenInput.value = '';
    growwTokenStatus.innerHTML = `<span style="color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-circle-info"></i> No token saved. Using sim data.</span>`;
  }
}

// Session Check on Load
async function checkSession() {
  const savedSession = localStorage.getItem('trader_session');
  if (savedSession) {
    try {
      const user = await API.getSession(savedSession);
      currentUser = user.username;
      enterDashboard(user);
    } catch (e) {
      localStorage.removeItem('trader_session');
      showToast('Session expired. Please log in.', 'info');
    }
  }
}

// Enter Dashboard Screen
function enterDashboard(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-dashboard').classList.remove('hidden');
  document.getElementById('user-display-name').innerText = user.username;

  // Defer initialization slightly to allow browser layout to complete
  setTimeout(() => {
    // Initialize interactive chart
    initChart();

    // Initialize Groww token UI state
    updateGrowwTokenStatus();

    // Load first stock and render listings
    renderStockList();

    // Start real-time updates (1 second polling)
    startPolling();
    
    // Immediate portfolio sync
    updatePortfolioUI();
  }, 100);
}

// Exit Dashboard Screen
function exitDashboard() {
  stopPolling();
  document.getElementById('main-dashboard').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('username-input').value = '';
  
  // Reset chart properly
  if (activeChart) {
    activeChart.remove();
    activeChart = null;
    candlestickSeries = null;
  }
  
  currentUser = null;
}

// Start 1-second status polling
function startPolling() {
  if (pollIntervalId) clearInterval(pollIntervalId);
  pollIntervalId = setInterval(async () => {
    try {
      const status = await API.getMarketStatus();
      updateMarketUI(status);
      updatePortfolioUI();
      
      // If currently on behavioral view, we can update it in real-time!
      const activeNav = document.querySelector('.nav-link.active');
      if (activeNav && activeNav.getAttribute('data-view') === 'view-analytics') {
        refreshBehavioralFeatures();
      }
    } catch (e) {
      console.error('Polling error', e);
    }
  }, 1000);
}

function stopPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

// Initialize TradingView Chart
function initChart() {
  const container = document.getElementById('tv-chart-container');
  container.innerHTML = ''; // Clear prior

  activeChart = LightweightCharts.createChart(container, {
    autoSize: true,
    layout: {
      background: { type: 'solid', color: '#131722' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
      horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
    },
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
      timeVisible: true,
      secondsVisible: false
    },
  });

  candlestickSeries = activeChart.addCandlestickSeries({
    upColor: '#10b981',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#10b981',
    wickDownColor: '#ef4444',
    wickUpColor: '#10b981',
  });
}

// Render stock selection table on left side
async function renderStockList() {
  try {
    const status = await API.getMarketStatus();
    const marketInfo = status.markets[activeMarket];
    const tbody = document.getElementById('stock-list-body');
    tbody.innerHTML = '';

    marketInfo.stocks.forEach((stock, idx) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-symbol', stock.symbol);
      if (stock.symbol === activeSymbol) {
        tr.className = 'active';
      }

      const isUp = stock.change >= 0;
      const chgClass = isUp ? 'text-success' : 'text-danger';
      const sign = isUp ? '+' : '';
      const symbolSymbol = activeMarket === 'NSE' ? '₹' : '$';

      tr.innerHTML = `
        <td>
          <span class="symbol-ticker">${stock.symbol}</span>
          <span class="symbol-desc">${stock.name}</span>
        </td>
        <td class="text-right font-weight-bold" id="ticker-price-${stock.symbol}">${symbolSymbol}${stock.currentPrice.toFixed(2)}</td>
        <td class="text-right ${chgClass}" id="ticker-chg-${stock.symbol}">${sign}${stock.changePercent.toFixed(2)}%</td>
      `;

      tr.addEventListener('click', () => {
        // Change Active Symbol
        document.querySelectorAll('#stock-list-body tr').forEach(row => row.classList.remove('active'));
        tr.classList.add('active');
        selectSymbol(stock.symbol);
      });

      tbody.appendChild(tr);
    });

    // Load initial chart for first item if activeSymbol not set or doesn't belong to active market
    const stockExists = marketInfo.stocks.some(s => s.symbol === activeSymbol);
    if (!stockExists && marketInfo.stocks.length > 0) {
      selectSymbol(marketInfo.stocks[0].symbol);
    } else {
      loadChartHistory(activeSymbol);
    }
  } catch (err) {
    showToast('Failed to load stock list', 'error');
  }
}

// Select a stock to view details and chart
async function selectSymbol(symbol) {
  activeSymbol = symbol;
  document.getElementById('positions-active-symbol').innerText = symbol;
  
  // Reload estimates
  updateOrderEstimates();

  // Load chart history
  loadChartHistory(symbol);
}

// Load historical data for selected stock
async function loadChartHistory(symbol) {
  try {
    const history = await API.getStockHistory(symbol);
    if (candlestickSeries) {
      candlestickSeries.setData(history);
      activeChart.timeScale().fitContent();
      
      // Save the last date from the history array to use for real-time updates
      if (history && history.length > 0) {
        activeSymbolLastDate = history[history.length - 1].time;
      } else {
        activeSymbolLastDate = null;
      }
      
      if (currentUser) {
        const data = await API.getPortfolio(currentUser);
        updateChartMarkers(data);
      }
    }
  } catch (e) {
    console.error('Failed to load chart history', e);
    activeSymbolLastDate = null;
  }
}

function updateChartMarkers(data) {
  if (!candlestickSeries || !activeSymbol) return;
  try {
    const markers = [];
    
    const activeOpen = data.openPositions.filter(p => p.symbol === activeSymbol);
    const activeClosed = data.closedPositions.filter(p => p.symbol === activeSymbol);
    
    const getTimeStr = (dateStr) => {
      if (!dateStr) return null;
      return dateStr.substring(0, 10);
    };

    activeOpen.forEach(p => {
      const time = getTimeStr(p.buyDate);
      if (time) {
        markers.push({ time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: '↑ BUY' });
      }
    });

    activeClosed.forEach(p => {
      const bTime = getTimeStr(p.buyDate);
      if (bTime) {
        markers.push({ time: bTime, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: '↑ BUY' });
      }
      const sTime = getTimeStr(p.sellDate);
      if (sTime) {
        markers.push({ time: sTime, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: '↓ SELL' });
      }
    });

    markers.sort((a, b) => a.time.localeCompare(b.time));
    candlestickSeries.setMarkers(markers);
  } catch (e) {
    console.error('Failed to update chart markers', e);
  }
}

// Refresh calculations inside trading page estimates
function updateOrderEstimates() {
  const qtyInput = document.getElementById('order-quantity');
  const qty = parseInt(qtyInput.value) || 0;

  const currentPriceText = document.getElementById('active-symbol-price').innerText;
  // strip currency symbol
  const price = parseFloat(currentPriceText.replace(/[₹$]/g, '').replace(/,/g, '')) || 0;
  const total = qty * price;
  
  const symbolSymbol = activeMarket === 'NSE' ? '₹' : '$';
  document.getElementById('order-price-est').innerText = `${symbolSymbol}${price.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('order-total-est').innerText = `${symbolSymbol}${total.toLocaleString(undefined, {minimumFractionDigits:2})}`;
}

// 1-second price ticks updates
function updateMarketUI(status) {
  // Update Sim Date Display
  document.getElementById('sim-time-display').innerText = status.formattedDate;

  const marketInfo = status.markets[activeMarket];
  if (!marketInfo) return;

  marketInfo.stocks.forEach(stock => {
    const priceTd = document.getElementById(`ticker-price-${stock.symbol}`);
    const chgTd = document.getElementById(`ticker-chg-${stock.symbol}`);
    const symbolSymbol = activeMarket === 'NSE' ? '₹' : '$';

    if (priceTd && chgTd) {
      const currentVal = stock.currentPrice;
      const prevVal = lastPrices[stock.symbol];

      // Flash cells on changes
      if (prevVal !== undefined && prevVal !== currentVal) {
        priceTd.className = `text-right font-weight-bold ${currentVal > prevVal ? 'flash-up' : 'flash-down'}`;
        setTimeout(() => {
          priceTd.className = 'text-right font-weight-bold';
        }, 700);
      }

      priceTd.innerText = `${symbolSymbol}${stock.currentPrice.toFixed(2)}`;
      
      const isUp = stock.change >= 0;
      chgTd.className = `text-right ${isUp ? 'text-success' : 'text-danger'}`;
      chgTd.innerText = `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`;

      lastPrices[stock.symbol] = currentVal;
    }

    // Active Symbol quote box update
    if (stock.symbol === activeSymbol) {
      const symbolSymbol = activeMarket === 'NSE' ? '₹' : '$';
      document.getElementById('active-symbol').innerText = stock.symbol;
      document.getElementById('active-symbol-name').innerText = stock.name;
      document.getElementById('active-symbol-market').innerText = activeMarket;
      document.getElementById('active-symbol-price').innerText = `${symbolSymbol}${stock.currentPrice.toLocaleString(undefined, {minimumFractionDigits:2})}`;
      
      const isUp = stock.change >= 0;
      const changeQuote = document.getElementById('active-symbol-change');
      changeQuote.className = `quote-change ${isUp ? 'positive' : 'negative'}`;
      changeQuote.innerText = `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`;

      // Update real-time candle tick in TradingView charts using the history's last date
      if (candlestickSeries && activeSymbolLastDate) {
        try {
          const isUp = stock.currentPrice >= stock.openPrice;
          candlestickSeries.update({
            time: activeSymbolLastDate,
            open: stock.openPrice,
            high: stock.highPrice,
            low: stock.lowPrice,
            close: stock.currentPrice,
            color: isUp ? '#22ff00' : '#ff0044', // Bright saturated glow color
            borderColor: isUp ? '#22ff00' : '#ff0044',
            wickColor: isUp ? '#22ff00' : '#ff0044'
          });
        } catch (e) {
          // Silently ignore update errors (e.g., if data not yet ready)
        }
      }
    }
  });

  updateOrderEstimates();
}

// 1-second portfolio status updates
async function updatePortfolioUI() {
  if (!currentUser) return;
  try {
    const data = await API.getPortfolio(currentUser);

    // Update buying power and equity in sidebar
    document.getElementById('equity-display').innerText = `₹${data.portfolioValue.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    document.getElementById('cash-balance-display').innerText = `Cash: ₹${data.user.balance.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    document.getElementById('buying-power-display').innerText = `₹${data.user.balance.toLocaleString(undefined, {minimumFractionDigits:2})}`;

    // Update Portfolio tab metrics
    document.getElementById('port-cash-balance').innerText = `₹${data.user.balance.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    document.getElementById('port-exposure').innerText = `₹${data.openPositionsValue.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    
    const rpnlEl = document.getElementById('port-realized-pnl');
    const rpnlPctEl = document.getElementById('port-realized-pnl-pct');
    // Simple realized calculation (we can count from closed positions)
    let realizedPnL = 0;
    data.closedPositions.forEach(c => realizedPnL += c.profit_loss);
    rpnlEl.innerText = `₹${realizedPnL.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    const rPnLUp = realizedPnL >= 0;
    rpnlEl.className = `metric-val ${rPnLUp ? 'text-success' : 'text-danger'}`;
    rpnlPctEl.innerText = `Closed: ${data.closedPositions.length} trades`;
    rpnlPctEl.className = 'metric-desc text-muted';

    // Net return calculations
    const netEl = document.getElementById('port-net-return');
    const netPctEl = document.getElementById('port-net-return-pct');
    netEl.innerText = `₹${data.totalPnL.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    const pnlUp = data.totalPnL >= 0;
    netEl.className = `metric-val ${pnlUp ? 'text-success' : 'text-danger'}`;
    netPctEl.className = `metric-desc ${pnlUp ? 'positive' : 'negative'}`;
    netPctEl.innerText = `${pnlUp ? '+' : ''}${data.totalPnLPercent.toFixed(2)}% on ₹10L`;

    // Render Open Positions Table
    const openTbody = document.getElementById('open-positions-tbody');
    openTbody.innerHTML = '';
    
    if (data.openPositions.length === 0) {
      openTbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No open positions in this session.</td></tr>`;
    } else {
      data.openPositions.forEach(pos => {
        const tr = document.createElement('tr');
        const isUp = pos.profit_loss >= 0;
        const pnlClass = isUp ? 'text-success' : 'text-danger';
        const symbolSymbol = pos.market === 'NSE' ? '₹' : '$';

        tr.innerHTML = `
          <td><span class="pos-symbol">${pos.symbol}</span><span class="pos-market">${pos.market}</span></td>
          <td class="text-right font-weight-bold">${pos.quantity}</td>
          <td class="text-right">${symbolSymbol}${pos.buyPrice.toFixed(2)}</td>
          <td class="text-right font-weight-bold">${symbolSymbol}${pos.currentPrice.toFixed(2)}</td>
          <td class="text-right">₹${pos.buyValue.toLocaleString()}</td>
          <td class="text-right font-weight-bold">₹${pos.currentValue.toLocaleString()}</td>
          <td class="text-right font-weight-bold ${pnlClass}">
            ₹${pos.profit_loss.toLocaleString()}<br>
            <span class="small font-weight-normal">${isUp ? '+' : ''}${pos.profit_loss_percent.toFixed(2)}%</span>
          </td>
          <td class="text-center">
            <button class="btn btn-danger btn-block btn-sell-pos" data-trade-id="${pos.tradeId}">SELL/CLOSE</button>
          </td>
        `;

        tr.querySelector('.btn-sell-pos').addEventListener('click', async () => {
          try {
            const res = await API.sellStock(currentUser, pos.tradeId);
            showToast(res.message, 'success');
            
            // Gamification feedback
            if (res.trade && res.trade.profit_loss > 0) {
              triggerConfetti();
            } else if (res.trade && res.trade.profit_loss < 0) {
              triggerShake(tr);
            }

            updatePortfolioUI();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });

        openTbody.appendChild(tr);
      });
    }

    // Render Mini Position Panel in Order Card
    const miniPosList = document.getElementById('stock-positions-list');
    miniPosList.innerHTML = '';
    const activeOpenPos = data.openPositions.filter(p => p.symbol === activeSymbol);
    
    if (activeOpenPos.length === 0) {
      miniPosList.innerHTML = `<div class="p-2 text-center text-muted text-xs">No active positions.</div>`;
    } else {
      activeOpenPos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'mini-pos-row';
        const isUp = p.profit_loss >= 0;
        const symbolSymbol = p.market === 'NSE' ? '₹' : '$';

        div.innerHTML = `
          <div>
            <span class="mini-pos-sym">${p.symbol}</span>
            <span class="mini-pos-qty">x${p.quantity}</span>
            <div class="text-muted text-xs">Avg: ${symbolSymbol}${p.buyPrice.toFixed(2)}</div>
          </div>
          <div class="text-right">
            <div class="mini-pos-pnl ${isUp ? 'positive' : 'negative'}">
              ₹${p.profit_loss.toFixed(0)}
            </div>
            <button class="btn btn-outline btn-sell-pos-mini" style="font-size:0.65rem; padding: 2px 6px;" data-trade-id="${p.tradeId}">SELL</button>
          </div>
        `;

        div.querySelector('.btn-sell-pos-mini').addEventListener('click', async () => {
          try {
            const res = await API.sellStock(currentUser, p.tradeId);
            showToast(res.message, 'success');
            
            // Gamification feedback
            if (res.trade && res.trade.profit_loss > 0) {
              triggerConfetti();
            } else if (res.trade && res.trade.profit_loss < 0) {
              triggerShake(div);
            }

            updatePortfolioUI();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });

        miniPosList.appendChild(div);
      });
    }

    // Render Closed Trades Table
    const closedTbody = document.getElementById('closed-positions-tbody');
    closedTbody.innerHTML = '';
    
    // Update chart markers for Buy/Sell
    updateChartMarkers(data);
    
    if (data.closedPositions.length === 0) {
      closedTbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No completed trades recorded in this session.</td></tr>`;
    } else {
      data.closedPositions.forEach(pos => {
        const tr = document.createElement('tr');
        const isUp = pos.profit_loss >= 0;
        const pnlClass = isUp ? 'text-success' : 'text-danger';
        const symbolSymbol = pos.market === 'NSE' ? '₹' : '$';

        tr.innerHTML = `
          <td><span class="pos-symbol">${pos.symbol}</span><span class="pos-market">${pos.market}</span></td>
          <td class="text-right">${pos.quantity}</td>
          <td class="text-right">${symbolSymbol}${pos.buyPrice.toFixed(2)}</td>
          <td class="text-right">${symbolSymbol}${pos.sellPrice.toFixed(2)}</td>
          <td class="text-right">₹${pos.buyValue.toLocaleString()}</td>
          <td class="text-right">₹${pos.sellValue.toLocaleString()}</td>
          <td class="text-right font-weight-bold ${pnlClass}">₹${pos.profit_loss.toLocaleString()}</td>
          <td style="font-size: 0.72rem;">${pos.buyDate.substring(0, 10)} ${pos.buyDate.substring(11, 19)}</td>
          <td style="font-size: 0.72rem;">${pos.sellDate.substring(0, 10)} ${pos.sellDate.substring(11, 19)}</td>
        `;
        closedTbody.appendChild(tr);
      });
    }

  } catch (e) {
    console.error('Failed to update portfolio UI', e);
  }
}

// 1-second/Nav behavioral features refresh
async function refreshBehavioralFeatures() {
  if (!currentUser) return;
  try {
    const f = await API.getBehavioralFeatures(currentUser);

    // Bind Performance features
    document.getElementById('feat-win_rate').innerText = `${f.win_rate}%`;
    document.getElementById('bar-win_rate').style.width = `${f.win_rate}%`;
    
    document.getElementById('feat-profit_factor').innerText = f.profit_factor;
    // Cap bar display at profit factor 4.0
    const pfPercentage = Math.min(100, (f.profit_factor / 4) * 100);
    document.getElementById('bar-profit_factor').style.width = `${pfPercentage}%`;

    document.getElementById('feat-avg_return_pct').innerText = `${f.avg_return_pct >= 0 ? '+' : ''}${f.avg_return_pct.toFixed(2)}%`;
    document.getElementById('feat-avg_win_loss').innerText = `₹${f.avg_profit.toFixed(0)} / -₹${f.avg_loss.toFixed(0)}`;

    // Holding Mechanics
    document.getElementById('feat-avg_holding_days').innerText = `${f.avg_holding_days.toFixed(4)} days`;
    document.getElementById('feat-holding_variance').innerText = f.holding_variance.toFixed(4);
    
    document.getElementById('feat-same_day_trade_ratio').innerText = `${f.same_day_trade_ratio}%`;
    document.getElementById('bar-same_day_trade_ratio').style.width = `${f.same_day_trade_ratio}%`;

    // Activity level
    document.getElementById('feat-trades_per_month').innerText = f.trades_per_month.toFixed(1);
    document.getElementById('feat-avg_trades_per_day').innerText = f.avg_trades_per_day.toFixed(2);
    document.getElementById('feat-avg_gap_between_trades').innerText = `${f.avg_gap_between_trades.toFixed(4)} days`;

    // Risk Profile
    document.getElementById('feat-avg_position_size').innerText = `₹${f.avg_position_size.toLocaleString(undefined, {maximumFractionDigits:0})}`;
    document.getElementById('feat-position_size_variance').innerText = `₹${f.position_size_variance.toLocaleString(undefined, {maximumFractionDigits:0})}`;
    document.getElementById('feat-risk_escalation_ratio').innerText = f.risk_escalation_ratio.toFixed(2);

    // Emotional Response
    const sizeShiftText = `${f.post_loss_position_change >= 0 ? '+' : ''}${f.post_loss_position_change.toFixed(1)}%`;
    document.getElementById('feat-post_loss_position_change').innerText = sizeShiftText;
    document.getElementById('feat-post_loss_trade_delay').innerText = `${f.post_loss_trade_delay.toFixed(4)} days`;
    document.getElementById('feat-pnl_std').innerText = `₹${f.pnl_std.toLocaleString(undefined, {maximumFractionDigits:0})}`;
    document.getElementById('feat-streaks').innerText = `${f.max_win_streak} wins / ${f.max_loss_streak} losses`;

  } catch (e) {
    console.error('Failed to load behavioral features', e);
  }
}

// Render AI psychology report using FastAPI dynamic ML response
function renderPsychologyReport(r) {
  const container = document.getElementById('report-view-container');
  if (container) container.classList.remove('hidden');

  const createDate = new Date();
  const dateEl = document.getElementById('report-date');
  if (dateEl) dateEl.innerText = `Diagnostic Code: ML-DYNAMIC | Compiled: ${createDate.toLocaleDateString()} ${createDate.toLocaleTimeString()}`;

  const overallScore = r.trader_profile.confidence || 0;
  
  setTimeout(() => {
    const ctx = document.getElementById('simMultiVariChart');
    if (ctx) {
      if (window.reportRadarChart) window.reportRadarChart.destroy();
      
      const featureLabels = r.feature_importance ? r.feature_importance.slice(0, 5).map(f => f.display_name.substring(0, 15)) : ['Discipline', 'Emotion', 'Risk', 'Patience', 'Focus'];
      const featureData = r.feature_importance ? r.feature_importance.slice(0, 5).map(f => {
         if (f.impact === 'high') return 90;
         if (f.impact === 'medium') return 60;
         return 30;
      }) : [65, 59, 90, 81, 56];
      
      window.reportRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: featureLabels,
          datasets: [{
            label: 'Behavioral Weights',
            data: featureData,
            fill: true,
            backgroundColor: 'rgba(124, 92, 252, 0.2)',
            borderColor: 'rgb(124, 92, 252)',
            pointBackgroundColor: 'rgb(124, 92, 252)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(124, 92, 252)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              pointLabels: { color: '#a0aabf', font: { size: 10, family: 'Inter' } },
              ticks: { display: false, min: 0, max: 100 }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleColor: '#fff',
              bodyColor: '#a0aabf',
              padding: 10,
              cornerRadius: 8,
              displayColors: false
            }
          }
        }
      });
    }
  }, 100);

  const traderTypeEl = document.getElementById('report-trader-type');
  if (traderTypeEl) traderTypeEl.innerText = r.trader_profile.type;
  
  const summaryTextEl = document.getElementById('report-summary-text');
  if (summaryTextEl) summaryTextEl.innerText = r.trader_profile.description;

  // Populate the score breakdown (mocking sub-scores as overall score since ML doesn't segment them natively)
  if (document.getElementById('score-discipline')) document.getElementById('score-discipline').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-discipline')) document.getElementById('score-bar-discipline').style.width = `${overallScore}%`;
  if (document.getElementById('score-emotional')) document.getElementById('score-emotional').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-emotional')) document.getElementById('score-bar-emotional').style.width = `${overallScore}%`;
  if (document.getElementById('score-risk')) document.getElementById('score-risk').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-risk')) document.getElementById('score-bar-risk').style.width = `${overallScore}%`;
  if (document.getElementById('score-consistency')) document.getElementById('score-consistency').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-consistency')) document.getElementById('score-bar-consistency').style.width = `${overallScore}%`;

  // Strengths (Use summary stats)
  const strengthsContainer = document.getElementById('report-strengths-container');
  if (strengthsContainer) {
    strengthsContainer.innerHTML = '';
    const sDiv = document.createElement('div');
    sDiv.className = 'sw-item';
    sDiv.innerHTML = `
      <i class="fa-solid fa-circle-check sw-icon text-success"></i>
      <div class="sw-content">
        <h5>Win Rate <span class="sw-metric-badge">${r.summary_stats.win_rate.toFixed(1)}%</span></h5>
        <p>Total profitable trades: ${r.summary_stats.winning_trades} out of ${r.summary_stats.total_trades}</p>
      </div>
    `;
    strengthsContainer.appendChild(sDiv);
  }

  // Weaknesses (Use behavioral risks or loss causes)
  const weaknessesContainer = document.getElementById('report-weaknesses-container');
  if (weaknessesContainer) {
    weaknessesContainer.innerHTML = '';
    (r.behavioral_risks || []).slice(0, 3).forEach(w => {
      const div = document.createElement('div');
      div.className = 'sw-item';
      div.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation sw-icon text-danger"></i>
        <div class="sw-content">
          <h5>${w.name} <span class="sw-metric-badge">${w.score}/100</span></h5>
          <p>${w.description}</p>
        </div>
      `;
      weaknessesContainer.appendChild(div);
    });
    if ((r.behavioral_risks || []).length === 0) {
      weaknessesContainer.innerHTML = '<p class="text-muted text-sm mt-2">No critical behavioral risks detected.</p>';
    }
  }

  // Recommendations (Use future risks)
  const recsContainer = document.getElementById('report-recommendations-list');
  if (recsContainer) {
    recsContainer.innerHTML = '';
    (r.future_risks || []).forEach(rec => {
      const li = document.createElement('li');
      li.innerText = rec.recommendation;
      recsContainer.appendChild(li);
    });
    if ((r.future_risks || []).length === 0) {
      recsContainer.innerHTML = '<li class="text-muted">Maintain current discipline.</li>';
    }
  }

  // Top Drivers list
  const driversList = document.getElementById('report-drivers-list');
  if (driversList) {
    driversList.innerHTML = '';
    (r.feature_importance || []).slice(0, 5).forEach(d => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${d.display_name}</strong>: ${d.explanation}`;
      driversList.appendChild(li);
    });
  }

  // Detailed Metrics table
  const metricsTbody = document.getElementById('report-metrics-tbody');
  if (metricsTbody) {
    metricsTbody.innerHTML = '';
    (r.feature_importance || []).forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.display_name}</strong></td>
        <td class="text-right font-weight-bold">${row.value}</td>
        <td class="text-right text-muted">${row.threshold}</td>
        <td class="text-center"><span class="metric-category-tag">${row.impact} impact</span></td>
      `;
      metricsTbody.appendChild(tr);
    });
  }
}

// Gamification Animation Helpers
function triggerConfetti() {
  if (typeof confetti !== 'undefined') {
    const duration = 2500;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ec4899', '#8b5cf6', '#10b981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ec4899', '#8b5cf6', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }
}

function triggerShake(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

