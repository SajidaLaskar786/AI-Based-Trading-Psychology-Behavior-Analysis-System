// scratch/test_features.js
// Test runner for behavioral features and AI classification model.

const db = require('../services/db');
const { extractFeatures } = require('../services/behavioralFeatures');
const { analyzePsychology } = require('../services/psychologyModel');

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  console.log('=== Starting Psychology Lab Calculations Verification ===\n');

  const testSimDate = new Date('2026-01-05T12:00:00Z');

  // Test Case 1: Empty Trade Profile (New User)
  console.log('1. Verifying Zero Trades Edge Case...');
  const zeroTrades = [];
  const zeroFeatures = extractFeatures(zeroTrades, testSimDate);
  
  assert(zeroFeatures.win_rate === 0, 'Win rate for 0 trades should be 0');
  assert(zeroFeatures.avg_profit === 0, 'Avg profit for 0 trades should be 0');
  assert(zeroFeatures.avg_loss === 0, 'Avg loss for 0 trades should be 0');
  assert(zeroFeatures.profit_factor === 0, 'Profit factor for 0 trades should be 0');
  assert(zeroFeatures.avg_holding_days === 0, 'Avg holding days for 0 trades should be 0');
  assert(zeroFeatures.holding_variance === 0, 'Holding variance for 0 trades should be 0');
  assert(zeroFeatures.trades_per_month === 0, 'Trades per month for 0 trades should be 0');
  assert(zeroFeatures.avg_position_size === 0, 'Avg position size for 0 trades should be 0');
  assert(zeroFeatures.risk_escalation_ratio === 1.0, 'Risk escalation ratio for 0 trades should be 1.0');
  assert(zeroFeatures.post_loss_position_change === 0, 'Post-loss size change for 0 trades should be 0');
  assert(zeroFeatures.post_loss_trade_delay === 0, 'Post-loss delay for 0 trades should be 0');

  // Test Case 2: Single Trade Profile
  console.log('\n2. Verifying Single Trade Edge Case...');
  const singleTrade = [
    {
      tradeId: 't_test1',
      username: 'test_user',
      market: 'NSE',
      symbol: 'RELIANCE',
      buyDate: new Date('2026-01-01T09:30:00Z').toISOString(),
      buyDateReal: new Date().toISOString(),
      sellDate: new Date('2026-01-02T09:30:00Z').toISOString(), // 1.0 simulation days holding
      sellDateReal: new Date().toISOString(),
      buyPrice: 100,
      sellPrice: 110,
      buyValue: 10000,
      sellValue: 11000,
      quantity: 100,
      profit_loss: 1000,
      status: 'CLOSED'
    }
  ];

  const singleFeatures = extractFeatures(singleTrade, testSimDate);
  assert(singleFeatures.win_rate === 100, 'Win rate for single winning trade should be 100%');
  assert(singleFeatures.avg_profit === 1000, 'Avg profit should equal realized win');
  assert(singleFeatures.avg_loss === 0, 'Avg loss should be 0');
  assert(singleFeatures.profit_factor === 99.9, 'Profit factor with no losses should fall back to 99.9');
  assert(singleFeatures.avg_holding_days === 1.0, 'Avg holding days should be 1.0');
  assert(singleFeatures.holding_variance === 0, 'Holding variance for single trade must be 0');
  assert(singleFeatures.position_size_variance === 0, 'Position size variance for single trade must be 0');

  // Test Case 3: Multiple Trades Performance & Emotional Sizing Sequence
  console.log('\n3. Verifying Complex Multi-Trade and Emotional Sequence...');
  
  // Sizing Sequence:
  // Trade 1: Size 10,000, Profit -1,000 (Loss)
  // Trade 2: Size 20,000 (Revenge size: +100%!), Profit +2,000 (Win)
  // Trade 3: Size 15,000 (Size after win), Profit +1,500 (Win)
  
  const tradesList = [
    {
      tradeId: 't_1',
      username: 'tester',
      market: 'NSE',
      symbol: 'RELIANCE',
      buyDate: new Date('2026-01-01T09:30:00Z').toISOString(),
      sellDate: new Date('2026-01-01T15:30:00Z').toISOString(), // same day (0.25 day hold)
      buyPrice: 100,
      sellPrice: 90,
      buyValue: 10000,
      sellValue: 9000,
      quantity: 100,
      profit_loss: -1000,
      status: 'CLOSED'
    },
    {
      tradeId: 't_2',
      username: 'tester',
      market: 'NSE',
      symbol: 'RELIANCE',
      buyDate: new Date('2026-01-02T10:30:00Z').toISOString(), // gap since t_1 sell: 19 hours = 0.79 days
      sellDate: new Date('2026-01-03T10:30:00Z').toISOString(), // 1.0 day hold
      buyPrice: 100,
      sellPrice: 110,
      buyValue: 20000, // Doubled size after loss!
      sellValue: 22000,
      quantity: 200,
      profit_loss: 2000,
      status: 'CLOSED'
    },
    {
      tradeId: 't_3',
      username: 'tester',
      market: 'NSE',
      symbol: 'TCS',
      buyDate: new Date('2026-01-04T12:00:00Z').toISOString(), // gap since t_2 sell: 1.06 days
      sellDate: new Date('2026-01-06T12:00:00Z').toISOString(), // 2.0 day hold
      buyPrice: 3000,
      sellPrice: 3300,
      buyValue: 15000, // Size after win
      sellValue: 16500,
      quantity: 5,
      profit_loss: 1500,
      status: 'CLOSED'
    }
  ];

  const features = extractFeatures(tradesList, new Date('2026-01-07T12:00:00Z'));
  
  // Asserts for Scenario C/D
  assert(features.win_rate === 66.67, `Win rate: ${features.win_rate} (expected 66.67%)`);
  assert(features.avg_profit === 1750, `Avg profit: ${features.avg_profit} (expected 1750)`);
  assert(features.avg_loss === 1000, `Avg loss: ${features.avg_loss} (expected 1000)`);
  assert(features.profit_factor === 3.5, `Profit factor: ${features.profit_factor} (expected 3.5)`);
  
  // Holding (holds: 0.25, 1.0, 2.0 days) => avg = 3.25 / 3 = 1.0833
  assert(Math.abs(features.avg_holding_days - 1.0833) < 0.01, `Avg holding: ${features.avg_holding_days} (expected ~1.08)`);
  
  // Same day trade (1 of 3: t_1 buy/sell on Jan 1) => 33.33%
  assert(features.same_day_trade_ratio === 33.33, `Same day ratio: ${features.same_day_trade_ratio}% (expected 33.33%)`);
  
  // Position sizing (10k, 20k, 15k) => avg = 45k/3 = 15,000
  assert(features.avg_position_size === 15000, `Avg position size: ${features.avg_position_size} (expected 15000)`);

  // Revenge sizing check
  // Trade entered after loss (t_2) has size 20,000. Losing trade (t_1) size was 10,000.
  // Sizing change: (20000 - 10000) / 10000 * 100 = +100%
  assert(features.post_loss_position_change === 100, `Post-loss sizing change: ${features.post_loss_position_change}% (expected 100%)`);

  // Post-loss delay
  // t_1 closed Jan 1 15:30. t_2 opened Jan 2 10:30.
  // diff = 19 hours = 19/24 = 0.7916 simulation days
  assert(Math.abs(features.post_loss_trade_delay - 0.7917) < 0.01, `Post-loss delay: ${features.post_loss_trade_delay} (expected ~0.79 days)`);

  // Risk escalation ratio
  // Trade size entered after win (t_3): 15,000
  // Trade size entered after loss (t_2): 20,000
  // Ratio = 15000 / 20000 = 0.75
  assert(features.risk_escalation_ratio === 0.75, `Risk escalation ratio: ${features.risk_escalation_ratio} (expected 0.75)`);

  // Test Case 4: AI Model and Diagnostics Report Generation
  console.log('\n4. Verifying Psychology Analysis Model...');
  const report = analyzePsychology('tester', tradesList, new Date('2026-01-07T12:00:00Z'));
  
  assert(report.username === 'tester', 'Report username should match');
  assert(report.scores.overall > 0 && report.scores.overall <= 100, `Overall score: ${report.scores.overall} is valid`);
  assert(report.scores.discipline > 0 && report.scores.discipline <= 100, `Discipline score: ${report.scores.discipline} is valid`);
  assert(report.scores.emotionalStability > 0 && report.scores.emotionalStability <= 100, `Emotional score: ${report.scores.emotionalStability} is valid`);
  assert(report.topDrivers.length === 5, 'Should identify exactly 5 behavioral drivers');
  assert(report.strengths.length === 3, 'Should extract exactly 3 strengths');
  assert(report.weaknesses.length === 3, 'Should extract exactly 3 weaknesses');
  assert(report.recommendations.length === 4, 'Should generate exactly 4 recommendations');
  assert(report.reportText.includes('TRADER PSYCHOLOGY REPORT'), 'Report text should match formatting guidelines');

  console.log('\n=== All Automated Behavioral and Diagnostics Tests Passed! ===');
}

runTests().catch(err => {
  console.error('[CRITICAL TEST FAILURE]', err);
  process.exit(1);
});
