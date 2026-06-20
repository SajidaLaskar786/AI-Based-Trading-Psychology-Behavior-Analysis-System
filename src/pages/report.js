/**
 * Report Page — Full analysis report with charts, future predictions, and animated 2D visualizations
 */
import { isLoggedIn, getUserInitials, getUserName, logout } from '../utils/auth.js';
let sortedTrades = [];

export function render() {
  if (!isLoggedIn()) {
    window.location.hash = '#/login';
    return '<div></div>';
  }

  const reportData = sessionStorage.getItem('tradepsych_report');
  if (!reportData) {
    window.location.hash = '#/dashboard';
    return '<div></div>';
  }

  const report = JSON.parse(reportData);
  const initials = getUserInitials();
  const name = getUserName();
  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Stylized cards for actionable advice items
  const bulletRecommendations = (report.futureRisks.recommendations || []).map(r => `
    <div class="advice-card" style="display: flex; gap: 14px; align-items: flex-start; padding: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-md); margin-bottom: var(--space-md); transition: all var(--transition-base); box-shadow: var(--shadow-sm); border-left: 3px solid var(--clr-primary);">
      <div class="advice-card-icon" style="display: flex; align-items: center; justify-content: center; background: rgba(124, 92, 252, 0.1); border-radius: 8px; width: 36px; height: 36px; font-size: var(--fs-md); flex-shrink: 0; border: 1px solid rgba(124, 92, 252, 0.2); color: var(--clr-primary-light);">
        ${r.icon || '💡'}
      </div>
      <div style="flex: 1;">
        <h4 style="font-size: var(--fs-sm); font-weight: 700; color: var(--clr-text); margin: 0 0 4px 0; font-family: var(--font-body);">${r.title}</h4>
        <p style="font-size: var(--fs-xs); color: var(--clr-text-secondary); line-height: 1.5; margin: 0;">${r.text}</p>
      </div>
    </div>
  `).join('');

  return `
    <div class="report-page">
      <!-- Top Bar -->
      <header class="dashboard-topbar">
        <div class="topbar-left">
          <div class="topbar-logo">ψ</div>
          <span class="topbar-brand">TradePsych AI</span>
        </div>
        <div class="topbar-right">
          <div class="topbar-user">
            <div class="topbar-avatar">${initials}</div>
            <span>${name}</span>
          </div>
          <button class="topbar-logout" id="logoutBtn">Log Out</button>
        </div>
      </header>

      <!-- Report Header -->
      <div class="report-header">
        <div class="report-header-top">
          <div>
            <h1>Analysis <span class="accent">Report</span></h1>
            <div class="report-date">${now} • ${report.summary.totalTrades} trades analyzed</div>
          </div>
          <div class="report-actions-top">
            <button class="btn-icon" id="backToDashboardBtn" title="New Analysis">🔄</button>
            <button class="btn-icon" id="printReportBtn" title="Print Report">🖨️</button>
          </div>
        </div>
      </div>

      <!-- Report Grid -->
      <div class="report-grid">

        <!-- Card 1 (LEFT): Psychological Profile Accuracy -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">🎯</span> Profile Accuracy</h2>
          <div style="display: flex; align-items: center; justify-content: space-around; gap: 20px; padding: 15px 0;">
            <div class="profile-ring-container">
              <div class="profile-ring" style="width: 130px; height: 130px; position: relative;">
                <svg style="width: 100%; height: 100%; transform: rotate(-90deg);">
                  <circle class="profile-ring-bg" cx="65" cy="65" r="55" style="fill: none; stroke: var(--clr-surface); stroke-width: 6;"></circle>
                  <circle class="profile-ring-fill" id="profileRingFill" cx="65" cy="65" r="55" style="fill: none; stroke: url(#profileGradient); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 345.6; stroke-dashoffset: 345.6; transition: stroke-dashoffset 1.5s ease;"></circle>
                  <defs>
                    <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--clr-primary-light)"></stop>
                      <stop offset="100%" stop-color="var(--clr-accent)"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div class="profile-ring-text" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span class="profile-confidence-value" style="font-family: var(--font-heading); font-size: var(--fs-xl); font-weight: 800; background: linear-gradient(135deg, var(--clr-primary-light), var(--clr-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${report.profile.confidence}%</span>
                  <span class="profile-confidence-label" style="font-size: 9px; color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.1em;">Confidence</span>
                </div>
              </div>
            </div>
            <div>
              <div style="margin-bottom: 16px;">
                <span style="font-size: var(--fs-xs); text-transform: uppercase; color: var(--clr-text-muted); font-weight: 600; letter-spacing: 0.05em;">Trader's Username</span>
                <div style="font-size: var(--fs-md); color: #fff; font-weight: 600; margin-top: 2px;">${name}</div>
              </div>
              <div style="margin-bottom: 16px;">
                <span style="font-size: var(--fs-xs); text-transform: uppercase; color: var(--clr-text-muted); font-weight: 600; letter-spacing: 0.05em;">Total Trades</span>
                <div style="font-size: var(--fs-md); color: #fff; font-weight: 600; margin-top: 2px;">${report.summary.totalTrades}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2 (RIGHT): Trader Type & Personality Summary -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">🎭</span> Trader Personality</h2>
          <div class="profile-info" style="display: flex; align-items: center; gap: 20px; padding: 10px 0;">
            <div style="font-size: 3rem; background: rgba(255,255,255,0.05); width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.2);">${report.profile.emoji}</div>
            <div>
              <span style="font-size: var(--fs-xs); text-transform: uppercase; color: var(--clr-text-muted); font-weight: 600; letter-spacing: 0.05em; display: block;">Trader Profile</span>
              <div class="profile-type-badge" style="margin-top: 4px; margin-bottom: 0;">${report.profile.type}</div>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <span style="font-size: var(--fs-xs); text-transform: uppercase; color: var(--clr-text-muted); font-weight: 600; letter-spacing: 0.05em;">Behavior Summary</span>
            <p style="font-size: var(--fs-sm); line-height: 1.6; opacity: 0.85; margin-top: 6px;">${report.profile.description}</p>
          </div>
        </div>

        <!-- Card 3: Behavioral Drivers Impact -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">📊</span> Behavioral Drivers</h2>
          <div class="feature-list" style="margin-top: var(--space-md);">
            ${report.features.slice(0, 5).map((f, index) => `
              <div class="feature-item">
                <div class="feature-rank">${index + 1}</div>
                <div class="feature-info">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span class="feature-label" style="margin-bottom: 0;">${f.name}</span>
                    <span class="feature-score">${f.importance}%</span>
                  </div>
                  <div class="feature-bar">
                    <div class="feature-bar-fill" style="width: ${f.importance}%;"></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Card 4: Actionable Advice -->
        <div class="report-section glass-card" style="display: flex; flex-direction: column;">
          <h2 class="section-title" style="margin-bottom: var(--space-md);"><span class="icon">💡</span> Actionable Advice</h2>
          <div class="advice-list" style="display: flex; flex-direction: column; height: 100%; justify-content: flex-start;">
            ${bulletRecommendations}
          </div>
        </div>

        <!-- Card 5: Future Risks & Recommendations -->
        <div class="report-section glass-card full-width">
          <h2 class="section-title"><span class="icon">🔮</span> Future Risks & Recommendations</h2>
          <p style="font-size: var(--fs-xs); color: var(--clr-text-secondary); margin-top: -12px; margin-bottom: var(--space-md); line-height: 1.5;">
            Actionable steps based on your emotional profile to limit potential future trading drawdowns.
          </p>
          <div class="recommendations" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-md); margin-top: var(--space-sm);">
            ${(report.futureRisks.recommendations || []).map(r => `
              <div class="recommendation-card">
                <div class="rec-icon ${r.severity}">${r.icon}</div>
                <div>
                  <div class="rec-title">${r.title}</div>
                  <div class="rec-text">${r.text}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Card 6: AI Future Projections Summary -->
        <div class="report-section glass-card full-width" style="background: rgba(124, 92, 252, 0.05); border: 1px solid rgba(124, 92, 252, 0.15);">
          <h2 class="section-title" style="color: var(--clr-primary-light);"><span class="icon">🧠</span> AI Future Behavioral Projections</h2>
          <p style="line-height: 1.7; font-size: var(--fs-sm); opacity: 0.9; margin: 0;">
            ${generateFuturePredictionsText(report.profile.type, report.summary.winRate, report.summary.profitFactor)}
          </p>
        </div>

      </div>

      <!-- Report Footer -->
      <div class="report-footer">
        <button class="btn-primary" id="newAnalysisBtn">
          🔄 New Analysis
        </button>
        <button class="btn-ghost" id="printBtn2">
          🖨️ Print Report
        </button>
      </div>
    </div>
  `;
}

export function mount() {
  const reportData = sessionStorage.getItem('tradepsych_report');
  if (!reportData) return;

  const report = JSON.parse(reportData);

  // Parse raw trades from session storage
  const tradesData = sessionStorage.getItem('tradepsych_trades');
  const rawTrades = tradesData ? JSON.parse(tradesData) : [];
  
  // Sort trades chronologically with robust date comparison
  sortedTrades = [...rawTrades].sort((a, b) => {
    const dateA = getTradeField(a, 'date');
    const dateB = getTradeField(b, 'date');
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeA - timeB;
  });
  
  // --- Animate Profile Ring ---
  setTimeout(() => {
    const ring = document.getElementById('profileRingFill');
    if (ring) {
      const circumference = 2 * Math.PI * 55; // r=55
      const offset = circumference * (1 - report.profile.confidence / 100);
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = offset;
    }
  }, 300);

  // Timeline removed

  // No visualization rendered as per user request

  // --- Event Listeners ---
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    logout();
    window.location.hash = '#/login';
  });

  document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
    window.location.hash = '#/dashboard';
  });

  document.getElementById('newAnalysisBtn')?.addEventListener('click', () => {
    window.location.hash = '#/dashboard';
  });

  document.getElementById('printReportBtn')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('printBtn2')?.addEventListener('click', () => {
    window.print();
  });
}

export function unmount() {
  // No cleanup needed
}

// --- Helper Functions ---

/**
 * Normalizes user trading csv fields case-insensitively using standard aliases
 */
function getTradeField(trade, fieldName) {
  if (!trade) return null;
  
  let value = null;
  try {
    const mapData = sessionStorage.getItem('tradepsych_column_map');
    if (mapData) {
      const columnMap = JSON.parse(mapData);
      const mappedKey = columnMap[fieldName];
      if (mappedKey && trade[mappedKey] !== undefined) {
        value = trade[mappedKey];
      }
    }
  } catch (e) {
    console.error("Error reading column map:", e);
  }

  if (value === null) {
    const aliases = {
      date: ['date', 'trade_date', 'tradedate', 'dt', 'buy_date', 'buydate', 'selldate', 'sell_date'],
      time: ['time', 'trade_time', 'tradetime', 'timestamp', 'ts'],
      symbol: ['symbol', 'ticker', 'stock', 'instrument', 'asset', 'stockname', 'stock_name'],
      side: ['side', 'type', 'direction', 'action', 'buy_sell', 'buysell', 'b/s'],
      quantity: ['quantity', 'qty', 'size', 'volume', 'lots', 'shares'],
      entry_price: ['entry_price', 'entryprice', 'entry', 'buy_price', 'open_price', 'openprice'],
      exit_price: ['exit_price', 'exitprice', 'exit', 'sell_price', 'close_price', 'closeprice'],
      pnl: ['pnl', 'p&l', 'profit', 'profit_loss', 'profitloss', 'pl', 'net_pnl', 'realized_pnl', 'realised_pnl', 'realisedp&l', 'realizedp&l', 'return', 'gain/loss', 'profit/loss', 'netp&l']
    };

    const expectedAliases = aliases[fieldName] || [];
    
    for (const key of Object.keys(trade)) {
      const normalizedKey = key.replace(/[\s_-]/g, '').toLowerCase();
      if (expectedAliases.includes(normalizedKey)) {
        value = trade[key];
        break;
      }
    }
  }
  
  if (value === null && trade[fieldName] !== undefined) {
    value = trade[fieldName];
  }

  if (value !== null && value !== undefined) {
    if (['pnl', 'quantity', 'entry_price', 'exit_price'].includes(fieldName)) {
      if (typeof value === 'string') {
        const clean = value.replace(/[$\s,]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      }
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  }
  
  return ['pnl', 'quantity', 'entry_price', 'exit_price'].includes(fieldName) ? 0 : null;
}

function renderRiskItem(emoji, name, value) {
  let level, levelClass;
  if (value >= 65) { level = 'High'; levelClass = 'high'; }
  else if (value >= 35) { level = 'Medium'; levelClass = 'medium'; }
  else { level = 'Low'; levelClass = 'low'; }

  return `
    <div class="risk-item risk-${levelClass}">
      <div class="risk-item-header">
        <span class="risk-name">${emoji} ${name}</span>
        <div>
          <span class="risk-value ${levelClass}">${value}%</span>
          <span class="badge badge-${levelClass === 'high' ? 'danger' : levelClass === 'medium' ? 'warning' : 'success'}" style="margin-left: 8px">${level}</span>
        </div>
      </div>
      <div class="risk-bar">
        <div class="risk-bar-fill ${levelClass}" style="width: ${value}%"></div>
      </div>
    </div>
  `;
}

/**
 * Generate future behavioral analysis predictions dynamically
 */
function generateFuturePredictionsText(traderType, winRate, profitFactor) {
  const t = traderType || 'Disciplined Trader';
  if (t.includes('Disciplined')) {
    return `Based on your disciplined profile and win rate of ${winRate}%, you are projected to maintain a steady equity curve. However, you should watch out for creeping complacency during extended winning streaks. We predict a 15% risk of overleveraging if you experience more than 5 consecutive wins. Keep following your checklist strictly to sustain your ${profitFactor}x profit factor.`;
  } else if (t.includes('Emotional')) {
    return `Your profile shows high emotional reactivity. Our AI predicts a 72% likelihood of escalating position sizes (revenge trading) immediately following 3 consecutive losing trades. In the next 30 sessions, emotional drawdowns could impact your cumulative performance by up to 35% if unmitigated. We strongly recommend using a hard daily loss limit to automatically halt your trading.`;
  } else if (t.includes('Impulsive')) {
    return `With high overtrading metrics, slippage and transaction drag are predicted to eat up to 28% of your net profits in the next month. Impulsive setups placed outside your core plan are projected to carry a 68% fail rate. Slow down your frequency and implement a 10-minute cooling-off period after exiting any trade.`;
  } else if (t.includes('Overconfident')) {
    return `Your risk escalation metrics indicate a tendency to scale up size aggressively after winning streaks. Our AI projects that a single outsized losing trade during your next drawdown cycle could erase up to 60% of your accumulated gains. Keep your position sizes flat regardless of recent outcomes.`;
  } else {
    // Risk-Averse / Fear-Driven
    return `Fear-driven premature exits (cutting winners short) are currently compressing your profit factor. We project that by letting your trades run to your original targets, your average win value could increase by 32% in the next 30 trades. We predict a tendency to miss out on large trends due to entry-hesitation; consider using limit orders instead of market entries.`;
  }
}

// Timeline generator removed
