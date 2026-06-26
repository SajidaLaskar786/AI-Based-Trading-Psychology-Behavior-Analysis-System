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
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkSession();
});

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
  genReportBtn.addEventListener('click', async () => {
    genReportBtn.disabled = true;
    genReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing Behavior Model...';
    
    try {
      const report = await API.generatePsychologyReport(currentUser);
      showToast(' trader psychology report compiled successfully!', 'success');
      renderPsychologyReport(report);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      genReportBtn.disabled = false;
      genReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Psychology Diagnostics Report';
    }
  });

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
    }
  } catch (e) {
    console.error('Failed to load chart history', e);
    activeSymbolLastDate = null;
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
          candlestickSeries.update({
            time: activeSymbolLastDate,
            open: stock.openPrice,
            high: stock.highPrice,
            low: stock.lowPrice,
            close: stock.currentPrice
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

// Render AI psychology report
function renderPsychologyReport(r) {
  const container = document.getElementById('report-view-container');
  container.classList.remove('hidden');

  // Set report date
  const createDate = new Date(r.createdAt);
  document.getElementById('report-date').innerText = `Diagnostic Code: ${r.reportId} | Compiled: ${createDate.toLocaleDateString()} ${createDate.toLocaleTimeString()}`;

  // Update Score Circle (stroke-dashoffset range is 314 to 0 based on score)
  const strokeOffset = 314.15 - (314.15 * (r.scores.overall / 100));
  const progressRing = document.getElementById('score-ring-progress');
  progressRing.style.strokeDashoffset = strokeOffset;
  
  // Set score text
  document.getElementById('report-score-val').innerText = r.scores.overall;
  
  // Set colored rings based on score
  if (r.scores.overall >= 70) {
    progressRing.style.stroke = '#10b981'; // green
  } else if (r.scores.overall >= 45) {
    progressRing.style.stroke = '#f59e0b'; // amber
  } else {
    progressRing.style.stroke = '#ef4444'; // red
  }

  // Classification & Summary
  document.getElementById('report-trader-type').innerText = r.traderType;
  document.getElementById('report-summary-text').innerText = r.reportText.split('Behavior Analysis: ')[1].split('\n\nTop Behavioral Drivers:')[0];

  // Dimension Scores
  document.getElementById('score-discipline').innerText = `${r.scores.discipline}/100`;
  document.getElementById('score-bar-discipline').style.width = `${r.scores.discipline}%`;
  
  document.getElementById('score-emotional').innerText = `${r.scores.emotional}/100`;
  document.getElementById('score-bar-emotional').style.width = `${r.scores.emotional}%`;

  document.getElementById('score-risk').innerText = `${r.scores.risk}/100`;
  document.getElementById('score-bar-risk').style.width = `${r.scores.risk}%`;

  document.getElementById('score-consistency').innerText = `${r.scores.consistency}/100`;
  document.getElementById('score-bar-consistency').style.width = `${r.scores.consistency}%`;

  // Strengths
  const strengthsContainer = document.getElementById('report-strengths-container');
  strengthsContainer.innerHTML = '';
  r.strengths.forEach(s => {
    const div = document.createElement('div');
    div.className = 'sw-item';
    div.innerHTML = `
      <i class="fa-solid fa-circle-check sw-icon text-success"></i>
      <div class="sw-content">
        <h5>${s.title} <span class="sw-metric-badge">${s.metric}</span></h5>
        <p>${s.desc}</p>
      </div>
    `;
    strengthsContainer.appendChild(div);
  });

  // Weaknesses
  const weaknessesContainer = document.getElementById('report-weaknesses-container');
  weaknessesContainer.innerHTML = '';
  r.weaknesses.forEach(w => {
    const div = document.createElement('div');
    div.className = 'sw-item';
    div.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation sw-icon text-danger"></i>
      <div class="sw-content">
        <h5>${w.title} <span class="sw-metric-badge">${w.metric}</span></h5>
        <p>${w.desc}</p>
      </div>
    `;
    weaknessesContainer.appendChild(div);
  });

  // Recommendations
  const recsContainer = document.getElementById('report-recommendations-list');
  recsContainer.innerHTML = '';
  r.recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.innerText = rec;
    recsContainer.appendChild(li);
  });

  // Top Drivers list
  const driversList = document.getElementById('report-drivers-list');
  driversList.innerHTML = '';
  r.topDrivers.forEach((d, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d.name}</strong>: ${d.explanation}`;
    driversList.appendChild(li);
  });

  // Detailed Metrics table
  const metricsTbody = document.getElementById('report-metrics-tbody');
  metricsTbody.innerHTML = '';

  const reportRowData = [
    { name: 'Win Rate', val: `${r.features.win_rate}%`, target: '55%', category: 'Performance' },
    { name: 'Profit Factor', val: r.features.profit_factor, target: '1.8', category: 'Performance' },
    { name: 'Average Return', val: `${r.features.avg_return_pct.toFixed(2)}%`, target: '>0.5%', category: 'Performance' },
    { name: 'Avg Holding Time', val: `${r.features.avg_holding_days.toFixed(3)} days`, target: '2.0 days', category: 'Holding' },
    { name: 'Holding Std Dev', val: r.features.holding_variance.toFixed(3), target: '<0.5', category: 'Holding' },
    { name: 'Same-Day Trade Ratio', val: `${r.features.same_day_trade_ratio}%`, target: '<25%', category: 'Holding' },
    { name: 'Trades Per Month', val: r.features.trades_per_month.toFixed(1), target: '25.0', category: 'Activity' },
    { name: 'Avg Gap Between Trades', val: `${r.features.avg_gap_between_trades.toFixed(3)} days`, target: '>0.5 days', category: 'Activity' },
    { name: 'Avg Position Size', val: `₹${r.features.avg_position_size.toLocaleString()}`, target: '₹20,000 - ₹50,000', category: 'Risk Management' },
    { name: 'Position Size Std Dev', val: `₹${r.features.position_size_variance.toLocaleString()}`, target: '<₹10,000', category: 'Risk Management' },
    { name: 'Risk Escalation Ratio', val: r.features.risk_escalation_ratio.toFixed(2), target: '1.0', category: 'Risk Management' },
    { name: 'Post-Loss Sizing Change', val: `${r.features.post_loss_position_change}%`, target: '<=0.0%', category: 'Emotional' },
    { name: 'Post-Loss Trade Delay', val: `${r.features.post_loss_trade_delay.toFixed(3)} days`, target: '>0.25 days', category: 'Emotional' },
    { name: 'Max Win / Loss Streaks', val: `${r.features.max_win_streak} / ${r.features.max_loss_streak}`, target: '4 / 2', category: 'Emotional' }
  ];

  reportRowData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.name}</strong></td>
      <td class="text-right font-weight-bold">${row.val}</td>
      <td class="text-right text-muted">${row.target}</td>
      <td class="text-center"><span class="metric-category-tag">${row.category}</span></td>
    `;
    metricsTbody.appendChild(tr);
  });
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
