// services/psychologyModel.js

const db = require('./db');
const { extractFeatures } = require('./behavioralFeatures');

// Professional benchmarks for deviation calculations (baseline values)
const BENCHMARKS = {
  win_rate: 55, // 55%
  profit_factor: 1.8,
  avg_holding_days: 2.0, // 2 simulation days
  holding_variance: 0.5,
  trades_per_month: 25,
  avg_trades_per_day: 1.2,
  avg_gap_between_trades: 0.5, // 0.5 days
  same_day_trade_ratio: 25, // 25%
  avg_position_size: 50000, // ₹50,000 (5% of ₹10L)
  position_size_variance: 10000,
  risk_escalation_ratio: 1.0,
  post_loss_position_change: 0.0, // 0% increase (disciplined sizing)
  post_loss_trade_delay: 0.25, // 0.25 simulation days (7.5 real seconds)
  pnl_std: 15000,
  max_win_streak: 4,
  max_loss_streak: 2
};

// Map features to dimension scores and trader types
function analyzePsychology(username, trades, currentSimDate) {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const totalTradesCount = trades.length;
  const closedTradesCount = closedTrades.length;

  // 1. Calculate features
  const features = extractFeatures(trades, currentSimDate);

  // 2. Compute 5 Behavioral Dimension Scores (0-100)
  
  // A. Discipline Score
  // - Position size consistency (low variance/avg ratio = high discipline)
  const cv = features.avg_position_size > 0 ? features.position_size_variance / features.avg_position_size : 0;
  const sizeConsistency = Math.max(0, 100 - cv * 100);

  // - Holding variance (lower relative variance is more disciplined)
  const hcv = features.avg_holding_days > 0 ? features.holding_variance / features.avg_holding_days : 0;
  const holdingConsistency = Math.max(0, 100 - hcv * 120);

  // - Overtrading penalty
  const frequencyPenalty = Math.max(0, Math.min(45, (features.avg_trades_per_day - 4) * 10));

  let disciplineScore = (sizeConsistency * 0.5 + holdingConsistency * 0.5) - frequencyPenalty;
  disciplineScore = Math.max(5, Math.min(100, disciplineScore));

  // B. Emotional Stability Score
  // - Revenge trading penalty: post_loss_position_change > 0 increases risk sizing
  const revengeSizingPenalty = features.post_loss_position_change > 0 
    ? Math.min(60, features.post_loss_position_change * 1.5) 
    : 0;

  // - Revenge trading speed: post_loss_trade_delay is small
  // If delay is < 0.1 days (3s), it's highly impulsive.
  let tradeDelayScore = 100;
  if (features.post_loss_trade_delay > 0) {
    tradeDelayScore = Math.min(100, (features.post_loss_trade_delay / 0.3) * 100);
  } else if (closedTrades.filter(t => t.profit_loss < 0).length > 0) {
    tradeDelayScore = 10; // has losses but 0 delay (traded instantly)
  }

  // - Consecutive losses penalty
  const streakLossPenalty = Math.min(30, features.max_loss_streak * 8);

  let emotionalScore = (tradeDelayScore * 0.5 + (100 - revengeSizingPenalty) * 0.5) - streakLossPenalty;
  emotionalScore = Math.max(5, Math.min(100, emotionalScore));

  // C. Risk Management Score
  // - Position size allocation (Ideal size: 1% to 10% of total capital, which is ₹10k to ₹100k)
  let allocationScore = 100;
  if (features.avg_position_size > 100000) {
    allocationScore = Math.max(10, 100 - ((features.avg_position_size - 100000) / 10000));
  } else if (features.avg_position_size < 5000 && features.avg_position_size > 0) {
    allocationScore = Math.max(30, 100 - ((5000 - features.avg_position_size) / 100));
  } else if (features.avg_position_size === 0) {
    allocationScore = 50; // no positions sizing data
  }

  // - Risk Escalation Ratio (deviation from 1.0 is bad)
  const escalationDeviation = Math.abs(1.0 - features.risk_escalation_ratio);
  const escalationScore = Math.max(10, 100 - escalationDeviation * 120);

  let riskScore = allocationScore * 0.5 + escalationScore * 0.5;
  riskScore = Math.max(5, Math.min(100, riskScore));

  // D. Consistency Score
  // - Holding variance
  const holdingScore = Math.max(10, 100 - hcv * 150);

  // - Wins vs losses streak balance
  const streakDiff = Math.abs(features.max_win_streak - features.max_loss_streak);
  const streakScore = Math.max(20, 100 - streakDiff * 10);

  let consistencyScore = holdingScore * 0.5 + streakScore * 0.5;
  consistencyScore = Math.max(5, Math.min(100, consistencyScore));

  // E. Overall Score
  let overallScore = disciplineScore * 0.25 + emotionalScore * 0.25 + riskScore * 0.3 + consistencyScore * 0.2;
  overallScore = Math.round(Math.max(5, Math.min(100, overallScore)));

  disciplineScore = Math.round(disciplineScore);
  emotionalScore = Math.round(emotionalScore);
  riskScore = Math.round(riskScore);
  consistencyScore = Math.round(consistencyScore);

  // 3. Trader Type Classification
  let traderType = 'Retail Trader';
  let reasoning = '';

  if (totalTradesCount === 0) {
    traderType = 'Inactive Observer';
    reasoning = 'No trades have been executed in this session yet. Execute trades to analyze your trading psychology.';
  } else if (features.same_day_trade_ratio >= 70 && features.avg_trades_per_day >= 5 && features.avg_holding_days < 0.15) {
    traderType = 'High-Frequency Trader';
    reasoning = 'You enter and exit positions rapidly within the same simulation day, focusing on short-term price fluctuations rather than holding for extended trends.';
  } else if (features.post_loss_trade_delay < 0.08 && revengeSizingPenalty > 20 && disciplineScore < 50) {
    traderType = 'FOMO / Revenge Trader';
    reasoning = 'You show strong signs of emotional trading, reacting to losses by immediately opening new, larger positions to recoup losses rapidly.';
  } else if (features.post_loss_position_change > 25 && emotionalScore < 50) {
    traderType = 'Emotional Trader';
    reasoning = 'Your trade sizes are heavily influenced by recent losses. You tend to scale up position sizes erratically when under stress.';
  } else if (features.avg_position_size > 200000 && riskScore < 45) {
    traderType = 'Aggressive Trader';
    reasoning = 'You allocate massive portions of your virtual capital (over 20%) to single trades, risking large losses for high returns.';
  } else if (features.avg_position_size < 30000 && riskScore > 75 && features.max_loss_streak <= 3) {
    traderType = 'Conservative / Risk-Averse Trader';
    reasoning = 'You focus heavily on capital preservation, keeping position sizes small and maintaining tight control over exposure.';
  } else if (features.avg_holding_days >= 0.2 && features.avg_holding_days <= 3.0 && features.win_rate > 50 && features.profit_factor > 1.1) {
    traderType = 'Momentum Trader';
    reasoning = 'You hold positions across multiple days to capture short-term trends, keeping a positive win rate and risk-reward profile.';
  } else if (disciplineScore > 70 && riskScore > 70 && consistencyScore > 65) {
    traderType = 'Disciplined Trader';
    reasoning = 'You execute trades with high consistency, sizing your positions carefully and avoiding emotional reactions after wins or losses.';
  } else {
    traderType = 'Momentum Trader'; // fallback classification that fits standard setups
    reasoning = 'You display balanced trading patterns, participating in market trends with moderate trade frequency and holding periods.';
  }

  // 4. Derive Top 5 Behavioral Drivers
  // Calculate relative deviations from benchmarks for each feature
  const driversList = [];
  for (const key in BENCHMARKS) {
    if (features[key] !== undefined) {
      const userVal = features[key];
      const benchmarkVal = BENCHMARKS[key];
      
      let deviation = 0;
      if (benchmarkVal !== 0) {
        deviation = Math.abs(userVal - benchmarkVal) / benchmarkVal;
      } else {
        deviation = Math.abs(userVal);
      }

      driversList.push({ key, userVal, benchmarkVal, deviation });
    }
  }

  // Sort drivers by deviation descending
  driversList.sort((a, b) => b.deviation - a.deviation);

  // Map keys to human friendly names and impacts
  const driverDetails = {
    win_rate: {
      name: 'Win Rate',
      impact: (val) => val > BENCHMARKS.win_rate 
        ? 'High execution precision is driving your profitability upwards.' 
        : 'Low win rate is placing significant drag on overall portfolio returns.'
    },
    profit_factor: {
      name: 'Profit Factor',
      impact: (val) => val > BENCHMARKS.profit_factor 
        ? 'Strong risk-to-reward ratios ensure your winners far outweigh your losers.' 
        : 'A low profit factor means losing trades are consuming too much of your gains.'
    },
    avg_holding_days: {
      name: 'Average Holding Days',
      impact: (val) => val > BENCHMARKS.avg_holding_days 
        ? 'Longer holding periods indicate patience and a focus on larger macro trends.' 
        : 'Short holding periods indicate active scalping and vulnerability to noise.'
    },
    same_day_trade_ratio: {
      name: 'Same Day Trade Ratio',
      impact: (val) => val > BENCHMARKS.same_day_trade_ratio 
        ? 'High same-day trading increases transaction frictions and suggests impulse entries.' 
        : 'Low same-day trading shows willingness to hold positions overnight.'
    },
    avg_position_size: {
      name: 'Average Position Size',
      impact: (val) => val > BENCHMARKS.avg_position_size 
        ? 'Large average position sizes increase leverage risk and drawdown exposure.' 
        : 'Small position sizes preserve capital but limit absolute growth potential.'
    },
    position_size_variance: {
      name: 'Position Size Variance',
      impact: (val) => val > BENCHMARKS.position_size_variance 
        ? 'Highly inconsistent position sizing creates unpredictable risk exposure.' 
        : 'Consistent sizing models illustrate professional capital management.'
    },
    risk_escalation_ratio: {
      name: 'Risk Escalation Ratio',
      impact: (val) => val > 1.2 
        ? 'Aggressive scaling up after winning trades points to market overconfidence.' 
        : val < 0.8 
          ? 'Defensive sizing shifts show fear or excessive post-loss adjustments.' 
          : 'Stable scaling maintains balanced sizing across wins and losses.'
    },
    post_loss_position_change: {
      name: 'Post-Loss Position Change',
      impact: (val) => val > 15 
        ? 'Doubling down on size after losses indicates active revenge trading.' 
        : 'Disciplined size reduction after losses preserves capital under pressure.'
    },
    post_loss_trade_delay: {
      name: 'Post-Loss Trade Delay',
      impact: (val) => val < 0.1 
        ? 'Impulsive, immediate re-entry after losses leads to rapid capital depletion.' 
        : 'Taking gaps between trades allows emotional recovery and strategy resets.'
    },
    max_loss_streak: {
      name: 'Max Loss Streak',
      impact: (val) => val > BENCHMARKS.max_loss_streak 
        ? 'Extended losing streaks represent failure to cut losses or stop trading.' 
        : 'Short losing streaks show good drawdown mitigation.'
    }
  };

  const topDrivers = [];
  let driverIdx = 0;
  while (topDrivers.length < 5 && driverIdx < driversList.length) {
    const driver = driversList[driverIdx];
    if (driverDetails[driver.key]) {
      const details = driverDetails[driver.key];
      topDrivers.push({
        name: details.name,
        explanation: details.impact(driver.userVal),
        value: driver.userVal
      });
    }
    driverIdx++;
  }

  // Ensure we have 5 drivers (fill with fallbacks if needed)
  const fallbackDrivers = [
    { name: 'Average Position Size', explanation: 'Controls total exposure per trade.' },
    { name: 'Win Rate', explanation: 'Measures strategy execution accuracy.' },
    { name: 'Profit Factor', explanation: 'Defines return efficiency ratios.' },
    { name: 'Average Holding Days', explanation: 'Highlights trading horizon preference.' },
    { name: 'Post-Loss Trade Delay', explanation: 'Indicates emotional control speed.' }
  ];

  while (topDrivers.length < 5) {
    const fallback = fallbackDrivers[topDrivers.length];
    topDrivers.push({
      name: fallback.name,
      explanation: fallback.explanation,
      value: 0
    });
  }

  // 5. Dynamic Strengths (exactly 3)
  const strengths = [];
  if (features.position_size_variance / Math.max(1, features.avg_position_size) < 0.25 && totalTradesCount > 0) {
    strengths.push({
      title: 'Sizing Consistency',
      metric: `Size CV: ${(features.position_size_variance / Math.max(1, features.avg_position_size) * 100).toFixed(0)}%`,
      desc: 'You maintain highly consistent position sizes, preventing individual trades from causing outsized losses.'
    });
  }
  if (features.win_rate > 52 && closedTradesCount > 0) {
    strengths.push({
      title: 'Execution Accuracy',
      metric: `Win Rate: ${features.win_rate}%`,
      desc: 'Your strategy achieves high entry precision, resulting in more winning than losing trades.'
    });
  }
  if (features.profit_factor > 1.4 && closedTradesCount > 0) {
    strengths.push({
      title: 'High Profit Efficiency',
      metric: `Profit Factor: ${features.profit_factor}`,
      desc: 'Your winning trades generate significantly more profit than your losing trades drain, showing positive skew.'
    });
  }
  if (features.avg_holding_days > 1.5 && closedTradesCount > 0) {
    strengths.push({
      title: 'Trade Maturity Patience',
      metric: `Holding Days: ${features.avg_holding_days.toFixed(1)}d`,
      desc: 'You give your trades space to breathe, capturing macro movements rather than panic selling.'
    });
  }
  if (features.post_loss_position_change <= 5 && closedTradesCount > 0) {
    strengths.push({
      title: 'Post-Loss Risk Control',
      metric: `Post-Loss size change: ${features.post_loss_position_change}%`,
      desc: 'You do not double down after losing trades, exhibiting professional composure and capital preservation.'
    });
  }
  if (features.max_loss_streak <= 2 && closedTradesCount > 0) {
    strengths.push({
      title: 'Drawdown Resilience',
      metric: `Max Loss Streak: ${features.max_loss_streak}`,
      desc: 'You successfully limit consecutive losing streaks, helping protect your emotional capital.'
    });
  }

  // Fallback strengths if not enough met
  const defaultStrengths = [
    { title: 'Capital Preservation', metric: '₹10,00,000 start', desc: 'You maintain a defensive stance, protecting your virtual capital from major early drawdowns.' },
    { title: 'Market Exploration', metric: 'Connected Markets', desc: 'You actively select and monitor diverse stocks to find high-probability setups.' },
    { title: 'Active Risk Monitoring', metric: 'Real-time Tracker', desc: 'You trade within the scope of your dashboard, keeping tabs on your balance changes.' }
  ];
  while (strengths.length < 3) {
    strengths.push(defaultStrengths[strengths.length]);
  }

  // 6. Dynamic Weaknesses (exactly 3)
  const weaknesses = [];
  if (features.post_loss_position_change > 15 && closedTradesCount > 0) {
    weaknesses.push({
      title: 'Revenge Position Sizing',
      metric: `Size change after loss: +${features.post_loss_position_change}%`,
      desc: 'You increase your position size significantly after a loss, suggesting an emotional attempt to force market returns.'
    });
  }
  if (features.post_loss_trade_delay < 0.1 && closedTradesCount > 0 && features.post_loss_trade_delay > 0) {
    weaknesses.push({
      title: 'Impulsive Re-entry',
      metric: `Post-loss delay: ${features.post_loss_trade_delay.toFixed(3)} days`,
      desc: 'You enter trades extremely fast after suffering a loss, indicating a lack of cool-down time.'
    });
  }
  if (features.position_size_variance / Math.max(1, features.avg_position_size) > 0.6 && totalTradesCount > 0) {
    weaknesses.push({
      title: 'Erratic Position Sizes',
      metric: `Size Variance: ₹${features.position_size_variance.toLocaleString()}`,
      desc: 'Your trade sizes differ widely, exposing your account to unpredictable risk swings.'
    });
  }
  if (features.same_day_trade_ratio > 60 && closedTradesCount > 0) {
    weaknesses.push({
      title: 'Overactive Scalping',
      metric: `Same-Day Trade: ${features.same_day_trade_ratio}%`,
      desc: 'You close most trades within the same simulation day, which risks overtrading and higher execution costs.'
    });
  }
  if (features.win_rate < 45 && closedTradesCount > 0) {
    weaknesses.push({
      title: 'Sub-optimal Win Rate',
      metric: `Win Rate: ${features.win_rate}%`,
      desc: 'Your trade accuracy is currently low. Focus on refining entry triggers and selecting high-liquidity stocks.'
    });
  }
  if (features.max_loss_streak > 3 && closedTradesCount > 0) {
    weaknesses.push({
      title: 'Extended Losing Streaks',
      metric: `Loss Streak: ${features.max_loss_streak}`,
      desc: 'You hold losing trades or execute bad trades consecutively, amplifying drawdowns.'
    });
  }

  // Fallback weaknesses
  const defaultWeaknesses = [
    { title: 'Incomplete Trade Maturity', metric: 'N/A', desc: 'You exit trades too early to capture significant trends, restricting maximum yield.' },
    { title: 'Limited Session History', metric: 'Low trade volume', desc: 'You have executed few trades, making it difficult for the model to establish baseline habits.' },
    { title: 'Unbalanced Asset Diversification', metric: 'Concentrated Portfolio', desc: 'You focus heavily on a single market, missing out on diversifiable hedging.' }
  ];
  while (weaknesses.length < 3) {
    weaknesses.push(defaultWeaknesses[weaknesses.length]);
  }

  // 7. Dynamic Recommendations (exactly 4)
  const recommendations = [];
  if (features.post_loss_position_change > 15) {
    recommendations.push('Cool-down Rule: Commit to a mandatory 1 simulation day (30 real seconds) pause immediately following a losing trade.');
  }
  if (features.position_size_variance / Math.max(1, features.avg_position_size) > 0.5) {
    recommendations.push('Standardize Sizing: Set a fixed exposure target of 3% (₹30,000) per trade. Do not deviate by more than 10% from this amount.');
  }
  if (features.same_day_trade_ratio > 60) {
    recommendations.push('Extend Holding Periods: Avoid intra-day tick tracking. Practice keeping positions open for at least 2 simulation days.');
  }
  if (features.win_rate < 45) {
    recommendations.push('Refine Entry Criteria: Limit trades to highly liquid US/NSE large caps. Do not trade crypto during high intraday volatility spikes.');
  }
  if (features.avg_position_size > 150000) {
    recommendations.push('Reduce Total Leverage: Keep total open position value below ₹3,00,000 to prevent catastrophic portfolio drawdowns.');
  }

  // Generic fallback recommendations
  const defaultRecommendations = [
    'Define Clear Exit Rules: Document your take-profit and stop-loss levels *before* executing any order.',
    'Keep a Trading Log: Note the specific reason (momentum, value, chart pattern) for every entry.',
    'Review Market Volatility: Check historical daily candlesticks to identify support and resistance ranges.',
    'Maintain Sizing Discipline: Do not increase your risk size after a profitable trade out of overconfidence.'
  ];
  while (recommendations.length < 4) {
    recommendations.push(defaultRecommendations[recommendations.length]);
  }

  // 8. Generate Psychology Report Text
  const reportText = `TRADER PSYCHOLOGY REPORT

Overall Score: ${overallScore}/100

Trader Type: ${traderType}

Behavior Analysis: ${reasoning} ${
    overallScore > 75 
      ? 'You demonstrate solid tactical discipline, maintaining consistent risk controls and emotional stability.' 
      : overallScore > 50 
        ? 'Your trading metrics are average. Consistency is visible, but emotional impulses or erratic sizing restrict progress.' 
        : 'Your psychological profile indicates high-risk behaviors, including revenge trading, inconsistent sizing, or overtrading.'
  }

Top Behavioral Drivers:
1. ${topDrivers[0].name}: ${topDrivers[0].explanation}
2. ${topDrivers[1].name}: ${topDrivers[1].explanation}
3. ${topDrivers[2].name}: ${topDrivers[2].explanation}
4. ${topDrivers[3].name}: ${topDrivers[3].explanation}
5. ${topDrivers[4].name}: ${topDrivers[4].explanation}

Strengths:
✓ ${strengths[0].title}: ${strengths[0].desc} (${strengths[0].metric})
✓ ${strengths[1].title}: ${strengths[1].desc} (${strengths[1].metric})
✓ ${strengths[2].title}: ${strengths[2].desc} (${strengths[2].metric})

Weaknesses:
✗ ${weaknesses[0].title}: ${weaknesses[0].desc} (${weaknesses[0].metric})
✗ ${weaknesses[1].title}: ${weaknesses[1].desc} (${weaknesses[1].metric})
✗ ${weaknesses[2].title}: ${weaknesses[2].desc} (${weaknesses[2].metric})

Recommendations:
• ${recommendations[0]}
• ${recommendations[1]}
• ${recommendations[2]}
• ${recommendations[3]}

Detailed Metrics:
- Discipline Score: ${disciplineScore}
- Emotional Stability: ${emotionalScore}
- Risk Management: ${riskScore}
- Consistency Score: ${consistencyScore}
- Win Rate: ${features.win_rate}%
- Profit Factor: ${features.profit_factor}
- Average Holding Days: ${features.avg_holding_days.toFixed(2)}
`;

  return {
    reportId: 'rep_' + Math.random().toString(36).substring(2, 11),
    username,
    createdAt: new Date().toISOString(),
    simulationDate: currentSimDate.toISOString(),
    features,
    scores: {
      discipline: disciplineScore,
      emotionalStability: emotionalScore,
      riskManagement: riskScore,
      consistency: consistencyScore,
      overall: overallScore
    },
    traderType,
    strengths,
    weaknesses,
    recommendations,
    topDrivers,
    reportText
  };
}

module.exports = {
  analyzePsychology
};
