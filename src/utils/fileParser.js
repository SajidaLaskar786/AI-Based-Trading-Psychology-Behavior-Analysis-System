/**
 * File Parser — Parse CSV and Excel files using SheetJS
 */
import * as XLSX from 'xlsx';

/**
 * Parse an uploaded file (CSV or Excel) into a structured array of objects
 * @param {File} file - The uploaded File object
 * @returns {Promise<{ headers: string[], rows: object[], rawRows: any[][] }>}
 */
export async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to array of arrays
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row.'));
          return;
        }

        // Extract headers and rows
        const headers = rawData[0].map(h => String(h).trim().toLowerCase());
        const rawRows = rawData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

        // Convert to array of objects
        const rows = rawRows.map(row => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = row[idx] !== undefined ? row[idx] : null;
          });
          return obj;
        });

        resolve({ headers, rows, rawRows });
      } catch (err) {
        reject(new Error('Failed to parse file. Please ensure it is a valid CSV or Excel file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate that parsed data has expected trading columns
 * @param {string[]} headers
 * @returns {{ valid: boolean, missing: string[], mapped: object }}
 */
export function validateColumns(headers) {
  // Expected columns (flexible mapping)
  const columnMap = {
    date: ['date', 'trade_date', 'tradedate', 'dt'],
    time: ['time', 'trade_time', 'tradetime', 'timestamp', 'ts'],
    symbol: ['symbol', 'ticker', 'stock', 'instrument', 'asset'],
    side: ['side', 'type', 'direction', 'action', 'buy_sell', 'buysell', 'b/s'],
    quantity: ['quantity', 'qty', 'size', 'volume', 'lots', 'shares'],
    entry_price: ['entry_price', 'entryprice', 'entry', 'buy_price', 'open_price', 'openprice'],
    exit_price: ['exit_price', 'exitprice', 'exit', 'sell_price', 'close_price', 'closeprice'],
    pnl: ['pnl', 'p&l', 'profit', 'profit_loss', 'profitloss', 'pl', 'net_pnl', 'realized_pnl', 'return']
  };

  const mapped = {};
  const missing = [];

  for (const [key, aliases] of Object.entries(columnMap)) {
    const found = headers.find(h => aliases.includes(h.replace(/[\s_-]/g, '').toLowerCase()));
    if (found) {
      mapped[key] = found;
    } else {
      missing.push(key);
    }
  }

  return {
    valid: missing.length <= 2, // Allow some missing columns
    missing,
    mapped
  };
}

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Generate sample trading data for demo mode
 * @returns {{ headers: string[], rows: object[], rawRows: any[][] }}
 */
export function generateSampleData() {
  const symbols = ['AAPL', 'TSLA', 'NFLX', 'GOOGL', 'AMZN', 'MSFT', 'META', 'NVDA', 'AMD', 'SPY'];
  const headers = ['date', 'time', 'symbol', 'side', 'quantity', 'entry_price', 'exit_price', 'pnl'];
  const rows = [];
  const rawRows = [];

  const startDate = new Date('2025-01-06');
  let consecutiveLosses = 0;

  for (let i = 0; i < 120; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i / 4));

    const dateStr = date.toISOString().split('T')[0];
    const hour = 9 + Math.floor(Math.random() * 7);
    const minute = Math.floor(Math.random() * 60);
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.4 ? 'BUY' : 'SELL';
    const quantity = Math.floor(Math.random() * 50 + 10) * 10;
    const entryPrice = +(100 + Math.random() * 400).toFixed(2);

    // Simulate behavioral patterns
    let exitPrice;
    let pnl;

    // Revenge trading pattern: after consecutive losses, make riskier trades
    if (consecutiveLosses >= 2 && Math.random() > 0.3) {
      // Larger positions after losses (revenge trading)
      const change = (Math.random() - 0.6) * 15; // biased negative
      exitPrice = +(entryPrice + change).toFixed(2);
      pnl = +((exitPrice - entryPrice) * quantity * (side === 'BUY' ? 1 : -1)).toFixed(2);
    }
    // Panic exit: close positions with small profits after drawdown
    else if (consecutiveLosses >= 1 && Math.random() > 0.5) {
      const change = (Math.random() * 2); // very small positive
      exitPrice = +(entryPrice + change).toFixed(2);
      pnl = +((exitPrice - entryPrice) * quantity * (side === 'BUY' ? 1 : -1)).toFixed(2);
    }
    // Normal trading
    else {
      const change = (Math.random() - 0.45) * 10;
      exitPrice = +(entryPrice + change).toFixed(2);
      pnl = +((exitPrice - entryPrice) * quantity * (side === 'BUY' ? 1 : -1)).toFixed(2);
    }

    if (pnl < 0) {
      consecutiveLosses++;
    } else {
      consecutiveLosses = 0;
    }

    const row = { date: dateStr, time: timeStr, symbol, side, quantity, entry_price: entryPrice, exit_price: exitPrice, pnl };
    rows.push(row);
    rawRows.push([dateStr, timeStr, symbol, side, quantity, entryPrice, exitPrice, pnl]);
  }

  return { headers, rows, rawRows };
}
