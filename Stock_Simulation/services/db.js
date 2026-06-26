const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

// Ensure database directory and files exist
function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const checkAndCreate = (filePath, defaultContent) => {
    if (!fs.existsSync(filePath)) {
      writeAtomic(filePath, defaultContent);
    }
  };

  checkAndCreate(USERS_FILE, {});
  checkAndCreate(TRADES_FILE, []);
  checkAndCreate(REPORTS_FILE, []);
}

// Atomic write helper to prevent file corruption during crashes
function writeAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

// User operations
function getUsers() {
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  writeAtomic(USERS_FILE, users);
}

function getUser(username) {
  const users = getUsers();
  return users[username] || null;
}

function createUser(username) {
  const users = getUsers();
  if (users[username]) {
    return users[username];
  }
  const newUser = {
    username,
    balance: 1000000, // ₹10,00,000 starting virtual capital
    joinedAt: new Date().toISOString()
  };
  users[username] = newUser;
  saveUsers(users);
  return newUser;
}

function updateUserBalance(username, newBalance) {
  const users = getUsers();
  if (users[username]) {
    users[username].balance = Math.max(0, newBalance);
    saveUsers(users);
    return users[username];
  }
  return null;
}

// Trade operations
function getTrades() {
  try {
    const content = fs.readFileSync(TRADES_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function saveTrades(trades) {
  writeAtomic(TRADES_FILE, trades);
}

function getUserTrades(username) {
  const trades = getTrades();
  return trades.filter(t => t.username === username);
}

function addTrade(trade) {
  const trades = getTrades();
  trades.push(trade);
  saveTrades(trades);
  return trade;
}

function updateTrade(updatedTrade) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.tradeId === updatedTrade.tradeId);
  if (idx !== -1) {
    trades[idx] = updatedTrade;
    saveTrades(trades);
    return true;
  }
  return false;
}

// Report operations
function getReports() {
  try {
    const content = fs.readFileSync(REPORTS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function saveReports(reports) {
  writeAtomic(REPORTS_FILE, reports);
}

function getUserReports(username) {
  const reports = getReports();
  return reports.filter(r => r.username === username);
}

function addReport(report) {
  const reports = getReports();
  reports.push(report);
  saveReports(reports);
  return report;
}

// Initialize the database immediately
initDB();

module.exports = {
  getUser,
  createUser,
  updateUserBalance,
  getUserTrades,
  addTrade,
  updateTrade,
  getUserReports,
  addReport,
  getTrades
};
