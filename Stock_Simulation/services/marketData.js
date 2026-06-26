// services/marketData.js
// Live market data engine connected to Yahoo Finance public API
// Fallbacks to simulated prices if Yahoo is unavailable.

const YAHOO_TICKERS = {
  // NSE
  'NIFTY': '^NSEI',
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  // NASDAQ
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'NVDA': 'NVDA',
  'TSLA': 'TSLA',
  'GOOGL': 'GOOGL',
  // Crypto
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD',
  'SOL': 'SOL-USD',
  'DOGE': 'DOGE-USD',
  'ADA': 'ADA-USD'
};

const markets = {
  NSE: {
    currency: '₹',
    stocks: [
      { symbol: 'NIFTY', name: 'Nifty 50 Index', basePrice: 22000, volatility: 0.010, drift: 0.0002 },
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2500, volatility: 0.015, drift: 0.0003 },
      { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 3400, volatility: 0.012, drift: 0.0002 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1600, volatility: 0.013, drift: 0.00025 },
      { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1500, volatility: 0.017, drift: 0.0001 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 950, volatility: 0.014, drift: 0.0003 }
    ]
  },
  NASDAQ: {
    currency: '$',
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 180, volatility: 0.016, drift: 0.0004 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 400, volatility: 0.014, drift: 0.0005 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 800, volatility: 0.035, drift: 0.0015 },
      { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 170, volatility: 0.030, drift: 0.0002 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 150, volatility: 0.015, drift: 0.0003 }
    ]
  },
  CRYPTO: {
    currency: '$',
    stocks: [
      { symbol: 'BTC', name: 'Bitcoin', basePrice: 65000, volatility: 0.045, drift: 0.0008 },
      { symbol: 'ETH', name: 'Ethereum', basePrice: 3300, volatility: 0.050, drift: 0.00075 },
      { symbol: 'SOL', name: 'Solana', basePrice: 140, volatility: 0.075, drift: 0.0012 },
      { symbol: 'DOGE', name: 'Dogecoin', basePrice: 0.15, volatility: 0.10, drift: 0.0005 },
      { symbol: 'ADA', name: 'Cardano', basePrice: 0.50, volatility: 0.060, drift: 0.0003 }
    ]
  }
};

const activePrices = {}; // { SYMBOL: { current, open, high, low, base } }
const historyData = {}; // { SYMBOL: [ { time, open, high, low, close } ] }
const lastFetchTime = {}; // { SYMBOL: timestamp }
const FETCH_COOLDOWN_MS = 6000; // Refetch from Yahoo at most once every 6 seconds

// Box-Muller transform to get standard normal distribution random numbers
function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Parse Yahoo Chart Result to Candlestick format
function parseYahooHistory(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  
  const history = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      opens[i] !== null && opens[i] !== undefined &&
      highs[i] !== null && highs[i] !== undefined &&
      lows[i] !== null && lows[i] !== undefined &&
      closes[i] !== null && closes[i] !== undefined
    ) {
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      history.push({
        time: dateStr,
        open: parseFloat(opens[i].toFixed(2)),
        high: parseFloat(highs[i].toFixed(2)),
        low: parseFloat(lows[i].toFixed(2)),
        close: parseFloat(closes[i].toFixed(2))
      });
    }
  }
  return history;
}

// Fetch live and historical candles from Yahoo Finance API
async function fetchFromYahoo(symbol) {
  const ticker = YAHOO_TICKERS[symbol];
  if (!ticker) return;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=30d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error('Invalid chart response structure');
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose;
    const previousClose = meta.chartPreviousClose || currentPrice;
    
    // Parse history candles
    const history = parseYahooHistory(result);
    if (history.length > 0) {
      historyData[symbol] = history;
    }

    // Update active day quotes
    if (!activePrices[symbol]) {
      activePrices[symbol] = {
        current: currentPrice,
        open: meta.regularMarketDayOpen || previousClose,
        high: meta.regularMarketDayHigh || currentPrice,
        low: meta.regularMarketDayLow || currentPrice,
        base: previousClose
      };
    } else {
      activePrices[symbol].current = currentPrice;
      activePrices[symbol].open = meta.regularMarketDayOpen || previousClose;
      activePrices[symbol].high = meta.regularMarketDayHigh || currentPrice;
      activePrices[symbol].low = meta.regularMarketDayLow || currentPrice;
      activePrices[symbol].base = previousClose;
    }

    lastFetchTime[symbol] = Date.now();
  } catch (err) {
    console.error(`[Yahoo fetch failed for ${symbol}]:`, err.message);
    lastFetchTime[symbol] = Date.now(); // Set cooldown to prevent flooding
  }
}

// Groww Token & Fetch Engine
let currentGrowwToken = null;

function setGrowwToken(token) {
  currentGrowwToken = token;
}

// Fetch live quotes from Groww API
async function fetchFromGroww(symbol, token) {
  if (!token) return;
  
  // Only support NSE stocks for Groww API
  const isNse = markets.NSE.stocks.some(s => s.symbol === symbol);
  if (!isNse) return;

  try {
    const url = `https://api.groww.in/v1/live-data/quote?exchange=NSE&segment=CASH&trading_symbol=${symbol}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-API-VERSION': '1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'SUCCESS' && data.payload) {
      const payload = data.payload;
      const currentPrice = payload.last_price;
      
      // Parse ohlc
      let open = currentPrice;
      let high = currentPrice;
      let low = currentPrice;
      
      if (payload.ohlc) {
        const ohlc = payload.ohlc;
        if (typeof ohlc === 'object') {
          open = ohlc.open || currentPrice;
          high = ohlc.high || currentPrice;
          low = ohlc.low || currentPrice;
        } else if (typeof ohlc === 'string') {
          try {
            const formatted = ohlc.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            const parsed = JSON.parse(formatted);
            open = parsed.open || currentPrice;
            high = parsed.high || currentPrice;
            low = parsed.low || currentPrice;
          } catch (e) {
            // fallback
          }
        }
      }

      const dayChange = payload.day_change || 0;
      const base = currentPrice - dayChange;

      if (!activePrices[symbol]) {
        activePrices[symbol] = {
          current: currentPrice,
          open: open,
          high: high,
          low: low,
          base: base
        };
      } else {
        activePrices[symbol].current = currentPrice;
        activePrices[symbol].open = open;
        activePrices[symbol].high = high;
        activePrices[symbol].low = low;
        activePrices[symbol].base = base;
      }
      
      lastFetchTime[symbol] = Date.now();
    } else if (data.error) {
      throw new Error(data.error.message || 'Groww API error');
    }
  } catch (err) {
    console.error(`[Groww fetch failed for ${symbol}]:`, err.message);
    lastFetchTime[symbol] = Date.now(); // Set cooldown to prevent flooding
    // If it's a 401 Unauthorized, clear token
    if (err.message.includes('401') || err.message.toLowerCase().includes('token')) {
      console.warn('[System] Invalid Groww Token, clearing token.');
      currentGrowwToken = null;
    }
  }
}

// Fetch historical candles from Groww API
async function fetchHistoryFromGroww(symbol, token) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30); // 30 days back

  const formatDate = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 00:00:00`;
  };

  const startTimeStr = formatDate(start);
  const endTimeStr = formatDate(end);

  const url = `https://api.groww.in/v1/historical/candles?exchange=NSE&segment=CASH&trading_symbol=${symbol}&interval_in_minutes=1440&start_time=${encodeURIComponent(startTimeStr)}&end_time=${encodeURIComponent(endTimeStr)}`;
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-VERSION': '1.0'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}`);
  }

  const data = await res.json();
  const candles = data.candles || [];
  
  const history = candles.map(c => {
    const date = new Date(c[0] * 1000);
    const dateStr = date.toISOString().split('T')[0];
    return {
      time: dateStr,
      open: parseFloat(c[1].toFixed(2)),
      high: parseFloat(c[2].toFixed(2)),
      low: parseFloat(c[3].toFixed(2)),
      close: parseFloat(c[4].toFixed(2))
    };
  });

  history.sort((a, b) => a.time.localeCompare(b.time));
  return history;
}

// Generate default simulated data on startup as a robust fallback
function initDefaultData() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 days back

  for (const marketId in markets) {
    markets[marketId].stocks.forEach(stock => {
      let price = stock.basePrice;
      const history = [];
      const tempDate = new Date(startDate);

      for (let d = 0; d < 30; d++) {
        const dateStr = tempDate.toISOString().split('T')[0];
        const open = price;
        const changeFactor = Math.exp(stock.drift - 0.5 * Math.pow(stock.volatility, 2) + stock.volatility * randomNormal());
        const close = Math.max(0.01, price * changeFactor);
        const high = Math.max(open, close) * (1 + Math.abs(randomNormal()) * stock.volatility * 0.4);
        const low = Math.max(0.01, Math.min(open, close) * (1 - Math.abs(randomNormal()) * stock.volatility * 0.4));

        history.push({
          time: dateStr,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2))
        });

        price = close;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      historyData[stock.symbol] = history;
      activePrices[stock.symbol] = {
        current: price,
        open: price,
        high: price,
        low: price,
        base: price
      };
      lastFetchTime[stock.symbol] = 0;
    });
  }
}

// Fetch all tickers immediately on startup
async function primeCache() {
  console.log('[System] Fetching live market quotes from Yahoo Finance...');
  for (const marketId in markets) {
    for (const stock of markets[marketId].stocks) {
      await fetchFromYahoo(stock.symbol);
    }
  }
  console.log('[System] Yahoo Finance quote cache primed.');
}

// Background tick function (runs every 1 second)
async function tick() {
  const now = Date.now();

  for (const marketId in markets) {
    for (const stock of markets[marketId].stocks) {
      const active = activePrices[stock.symbol];
      if (!active) continue;

      // 1. Trigger Groww or Yahoo fetch if cache expired
      const timeSinceLastFetch = now - (lastFetchTime[stock.symbol] || 0);
      if (timeSinceLastFetch > FETCH_COOLDOWN_MS) {
        if (marketId === 'NSE' && currentGrowwToken) {
          // Fetch asynchronously in the background so it doesn't block the tick
          fetchFromGroww(stock.symbol, currentGrowwToken);
        } else {
          // Fetch asynchronously in the background so it doesn't block the tick
          fetchFromYahoo(stock.symbol);
        }
      }

      // 2. Overlay a tiny random jitter (0.01% max) to keep the charts ticking
      // and blinks updating, even when the live market is closed.
      const jitter = 1 + (Math.random() - 0.5) * 0.0003;
      active.current = parseFloat((active.current * jitter).toFixed(2));
      active.high = parseFloat(Math.max(active.high, active.current).toFixed(2));
      active.low = parseFloat(Math.min(active.low, active.current).toFixed(2));
    }
  }
}

// Startup Initialization
initDefaultData();
primeCache();
setInterval(tick, 1000);

// API accessible functions
function getMarketStatus() {
  const now = new Date();
  const result = {
    simDate: now.toISOString(),
    formattedDate: now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0],
    markets: {}
  };

  for (const marketId in markets) {
    result.markets[marketId] = {
      currency: markets[marketId].currency,
      stocks: markets[marketId].stocks.map(stock => {
        const active = activePrices[stock.symbol] || { current: stock.basePrice, open: stock.basePrice, high: stock.basePrice, low: stock.basePrice, base: stock.basePrice };
        const change = active.current - active.base;
        const changePercent = (change / active.base) * 100;

        return {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: active.current,
          openPrice: active.open,
          highPrice: active.high,
          lowPrice: active.low,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2))
        };
      })
    };
  }

  return result;
}

async function getStockHistory(symbol, token) {
  // Try fetching from Groww if it's NSE and token is present
  const isNse = markets.NSE?.stocks.some(s => s.symbol === symbol);
  if (isNse && token) {
    try {
      const history = await fetchHistoryFromGroww(symbol, token);
      if (history && history.length > 0) {
        historyData[symbol] = history;
        return history;
      }
    } catch (err) {
      console.error(`[Groww history fetch failed for ${symbol}]:`, err.message);
    }
  }

  // Fallback to local simulated/cached history
  return historyData[symbol] || null;
}

function getCurrentPrice(symbol) {
  const active = activePrices[symbol];
  return active ? active.current : null;
}

function getSimDate() {
  return new Date();
}

module.exports = {
  getMarketStatus,
  getStockHistory,
  getCurrentPrice,
  getSimDate,
  setGrowwToken,
  markets
};
