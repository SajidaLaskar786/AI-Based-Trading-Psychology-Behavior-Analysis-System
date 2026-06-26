// server.js
const express = require('express');
const path = require('path');
const db = require('./services/db');
const marketData = require('./services/marketData');
const { extractFeatures } = require('./services/behavioralFeatures');
const { analyzePsychology } = require('./services/psychologyModel');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// CORS headers (just in case)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Groww-Token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Middleware to capture Groww API Access Token
app.use((req, res, next) => {
  const token = req.headers['x-groww-token'] || process.env.GROWW_ACCESS_TOKEN;
  if (token) {
    marketData.setGrowwToken(token);
  }
  next();
});

// Authentication / Session Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanName = username.trim().toLowerCase();
  let user = db.getUser(cleanName);
  if (!user) {
    user = db.createUser(cleanName);
  }

  res.json(user);
});

// Get User Current Capital & Profile
app.get('/api/auth/session/:username', (req, res) => {
  const { username } = req.params;
  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Live Market Data Status
app.get('/api/market/status', (req, res) => {
  res.json(marketData.getMarketStatus());
});

// Historical Chart Data for a specific stock
app.get('/api/market/history/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const token = req.headers['x-groww-token'] || process.env.GROWW_ACCESS_TOKEN;
  try {
    const history = await marketData.getStockHistory(symbol.toUpperCase(), token);
    if (!history) {
      return res.status(404).json({ error: `Stock history not found for ${symbol}` });
    }
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buy Stock Order execution
app.post('/api/trade/buy', (req, res) => {
  const { username, market, symbol, quantity } = req.body;

  if (!username || !market || !symbol || !quantity) {
    return res.status(400).json({ error: 'Missing required trading parameters' });
  }

  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const price = marketData.getCurrentPrice(symbol.toUpperCase());
  if (!price) {
    return res.status(400).json({ error: 'Stock price unavailable or invalid symbol' });
  }

  const cost = qty * price;
  if (user.balance < cost) {
    return res.status(400).json({ error: `Insufficient balance. Required: ₹${cost.toLocaleString()}, Available: ₹${user.balance.toLocaleString()}` });
  }

  // Create trade object
  const trade = {
    tradeId: 't_' + Math.random().toString(36).substring(2, 11),
    username: user.username,
    market: market.toUpperCase(),
    symbol: symbol.toUpperCase(),
    buyDate: marketData.getSimDate().toISOString(),
    buyDateReal: new Date().toISOString(),
    sellDate: null,
    sellDateReal: null,
    buyPrice: price,
    sellPrice: null,
    buyValue: parseFloat(cost.toFixed(2)),
    sellValue: null,
    quantity: qty,
    profit_loss: null,
    status: 'OPEN'
  };

  db.addTrade(trade);
  const updatedUser = db.updateUserBalance(user.username, user.balance - cost);

  res.json({ message: 'Buy order executed successfully', trade, user: updatedUser });
});

// Sell Stock Order execution
app.post('/api/trade/sell', (req, res) => {
  const { username, tradeId } = req.body;

  if (!username || !tradeId) {
    return res.status(400).json({ error: 'Missing required execution parameters' });
  }

  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const trades = db.getUserTrades(user.username);
  const trade = trades.find(t => t.tradeId === tradeId && t.status === 'OPEN');
  
  if (!trade) {
    return res.status(400).json({ error: 'Open position not found' });
  }

  const price = marketData.getCurrentPrice(trade.symbol);
  if (!price) {
    return res.status(400).json({ error: 'Current price unavailable' });
  }

  const sellValue = trade.quantity * price;
  const profitLoss = sellValue - trade.buyValue;

  // Complete the trade
  trade.sellDate = marketData.getSimDate().toISOString();
  trade.sellDateReal = new Date().toISOString();
  trade.sellPrice = price;
  trade.sellValue = parseFloat(sellValue.toFixed(2));
  trade.profit_loss = parseFloat(profitLoss.toFixed(2));
  trade.status = 'CLOSED';

  db.updateTrade(trade);
  const updatedUser = db.updateUserBalance(user.username, user.balance + sellValue);

  res.json({ message: 'Sell order executed successfully', trade, user: updatedUser });
});

// Live Portfolio Valuation & Position Tracking
app.get('/api/trade/portfolio/:username', (req, res) => {
  const { username } = req.params;
  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const trades = db.getUserTrades(user.username);
  const openPositions = trades.filter(t => t.status === 'OPEN');
  const closedPositions = trades.filter(t => t.status === 'CLOSED');

  // Compute live values
  let openPositionsValue = 0;
  let totalCostOfOpen = 0;

  const enrichedOpenPositions = openPositions.map(pos => {
    const currentPrice = marketData.getCurrentPrice(pos.symbol);
    const currentValue = pos.quantity * currentPrice;
    const profitLoss = currentValue - pos.buyValue;
    const profitLossPercent = (profitLoss / pos.buyValue) * 100;

    openPositionsValue += currentValue;
    totalCostOfOpen += pos.buyValue;

    return {
      ...pos,
      currentPrice,
      currentValue: parseFloat(currentValue.toFixed(2)),
      profit_loss: parseFloat(profitLoss.toFixed(2)),
      profit_loss_percent: parseFloat(profitLossPercent.toFixed(2))
    };
  });

  const portfolioValue = user.balance + openPositionsValue;
  const totalPnL = portfolioValue - 1000000; // Starting capital is ₹10L
  const totalPnLPercent = (totalPnL / 1000000) * 100;

  res.json({
    user: {
      username: user.username,
      balance: user.balance,
      joinedAt: user.joinedAt
    },
    portfolioValue: parseFloat(portfolioValue.toFixed(2)),
    openPositionsValue: parseFloat(openPositionsValue.toFixed(2)),
    totalCostOfOpen: parseFloat(totalCostOfOpen.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    totalPnLPercent: parseFloat(totalPnLPercent.toFixed(2)),
    openPositions: enrichedOpenPositions,
    closedPositions: closedPositions
  });
});

// Calculate live 19 behavioral features
app.get('/api/analytics/features/:username', (req, res) => {
  const { username } = req.params;
  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const trades = db.getUserTrades(user.username);
  const features = extractFeatures(trades, marketData.getSimDate());
  res.json(features);
});

// Generate Trader Psychology Report
app.post('/api/analytics/report', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const trades = db.getUserTrades(user.username);
  const report = analyzePsychology(user.username, trades, marketData.getSimDate());
  db.addReport(report);

  res.json(report);
});

// Get all reports generated by user
app.get('/api/analytics/reports/:username', (req, res) => {
  const { username } = req.params;
  const user = db.getUser(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const reports = db.getUserReports(user.username);
  res.json(reports);
});

// Start listening
app.listen(PORT, () => {
  console.log(`[OK] Server running on http://localhost:${PORT}`);
});
