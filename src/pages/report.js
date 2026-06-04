/**
 * Report Page — Full analysis report with charts and visualizations
 */
import { isLoggedIn, getUserInitials, getUserName, logout } from '../utils/auth.js';
import { renderLossChart, renderRadarChart, destroyChart } from '../components/charts.js';

let lossChart = null;
let radarChart = null;

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

        <!-- Section 1: Trader Profile -->
        <div class="report-section glass-card full-width">
          <h2 class="section-title"><span class="icon">🎭</span> Trader Profile</h2>
          <div class="profile-section">
            <div class="profile-ring-container">
              <div class="profile-ring">
                <svg viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color: hsl(245, 85%, 65%)" />
                      <stop offset="100%" style="stop-color: hsl(160, 84%, 52%)" />
                    </linearGradient>
                  </defs>
                  <circle class="profile-ring-bg" cx="80" cy="80" r="70" />
                  <circle class="profile-ring-fill" id="profileRingFill" cx="80" cy="80" r="70" />
                </svg>
                <div class="profile-ring-text">
                  <span class="profile-confidence-value">${report.profile.confidence}%</span>
                  <span class="profile-confidence-label">Confidence</span>
                </div>
              </div>
            </div>
            <div class="profile-info">
              <div class="profile-type-badge">
                ${report.profile.emoji} ${report.profile.type}
              </div>
              <h3>${report.profile.type}</h3>
              <p class="profile-description">${report.profile.description}</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Behavioral Risks -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">⚠️</span> Behavioral Risks</h2>
          <div class="risk-list">
            ${renderRiskItem('🔥', 'Revenge Trading', report.risks.revengeTrade)}
            ${renderRiskItem('⚡', 'Overtrading', report.risks.overtrading)}
            ${renderRiskItem('😰', 'Panic Exit', report.risks.panicExit)}
            ${renderRiskItem('📉', 'Loss Aversion', report.risks.lossAversion)}
            ${renderRiskItem('🎯', 'Overconfidence', report.risks.overconfidence)}
          </div>
        </div>

        <!-- Section 3: Why The Model Thinks So -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">🔍</span> Why The Model Thinks So</h2>
          <div class="feature-list">
            ${report.features.map((f, i) => `
              <div class="feature-item" style="animation-delay: ${i * 0.1}s">
                <div class="feature-rank">${i + 1}</div>
                <div class="feature-info">
                  <div class="feature-label">${f.name}</div>
                  <div class="feature-bar-wrapper">
                    <div class="feature-bar">
                      <div class="feature-bar-fill" style="width: ${f.importance}%; animation-delay: ${i * 0.15}s"></div>
                    </div>
                    <span class="feature-score">${f.importance}%</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 4: Loss Analysis -->
        <div class="report-section glass-card">
          <h2 class="section-title"><span class="icon">💰</span> Loss Analysis</h2>
          <div class="loss-chart-container">
            <div class="loss-chart-canvas">
              <canvas id="lossChart"></canvas>
            </div>
            <div class="loss-legend">
              ${(report.lossAnalysis.causes || []).map(c => `
                <div class="loss-legend-item">
                  <div class="loss-legend-color" style="background: ${c.color}"></div>
                  <span class="loss-legend-text">${c.name}</span>
                  <span class="loss-legend-value">${c.percentage}%</span>
                </div>
              `).join('')}
              ${report.lossAnalysis.totalLoss ? `
                <div class="loss-legend-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1)">
                  <span class="loss-legend-text" style="font-weight: 600; color: var(--clr-text)">Total Loss</span>
                  <span class="loss-legend-value" style="color: var(--clr-danger)">$${report.lossAnalysis.totalLoss.toLocaleString()}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Section 5: Future Behavioral Risks -->
        <div class="report-section glass-card full-width">
          <h2 class="section-title"><span class="icon">🔮</span> Future Behavioral Risks</h2>
          <div class="future-risks-container">
            <div class="radar-chart-canvas">
              <canvas id="radarChart"></canvas>
            </div>
            <div class="recommendations">
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

  // --- Animate Profile Ring ---
  setTimeout(() => {
    const ring = document.getElementById('profileRingFill');
    if (ring) {
      const circumference = 2 * Math.PI * 70; // r=70
      const offset = circumference * (1 - report.profile.confidence / 100);
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = offset;
    }
  }, 300);

  // --- Render Charts ---
  setTimeout(() => {
    if (report.lossAnalysis.causes?.length) {
      lossChart = renderLossChart('lossChart', report.lossAnalysis.causes);
    }
    if (report.futureRisks.risks?.length) {
      radarChart = renderRadarChart('radarChart', report.futureRisks.risks);
    }
  }, 500);

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
  destroyChart(lossChart);
  destroyChart(radarChart);
  lossChart = null;
  radarChart = null;
}

// --- Helper Functions ---

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
