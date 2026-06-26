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
