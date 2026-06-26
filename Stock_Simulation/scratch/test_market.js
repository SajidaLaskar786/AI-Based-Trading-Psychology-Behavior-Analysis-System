// scratch/test_market.js
const marketData = require('../services/marketData');

async function runTest() {
  console.log("Market status on startup:");
  const status = marketData.getMarketStatus();
  console.log("Markets key:", Object.keys(status.markets));
  console.log("NSE stocks:", status.markets.NSE.stocks.map(s => ({ symbol: s.symbol, currentPrice: s.currentPrice })));

  const history = await marketData.getStockHistory('RELIANCE');
  console.log("\nRELIANCE history length:", history?.length);
  console.log("First history item:", history?.[0]);
  console.log("Last history item:", history?.[history?.length - 1]);
}

runTest();
