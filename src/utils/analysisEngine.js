/**
 * Analysis Engine — Mock ML behavioral analysis
 *
 * Analyzes parsed trading data using heuristic rules to simulate
 * an ML-based trading psychology analysis. Produces:
 * - Trader profile type + confidence
 * - Behavioral risk scores
 * - Feature importance rankings
 * - Loss cause breakdown
 * - Future risk predictions + recommendations
 */

/**
 * Run full analysis on trading data
 * @param {object[]} trades - Array of trade objects
 * @param {object} columnMap - Mapped column names
 * @returns {object} Full analysis report
 */
export function analyzeTrading(trades, columnMap) {
  const col = (key) => columnMap[key] || key;

  // --- Parse trades into normalized format ---
  const normalized = trades.map(t => ({
    date: t[col('date')],
    time: t[col('time')] || '12:00',
    symbol: t[col('symbol')] || 'UNKNOWN',
    side: String(t[col('side')] || 'BUY').toUpperCase(),
    quantity: parseFloat(t[col('quantity')]) || 0,
    entryPrice: parseFloat(t[col('entry_price')]) || 0,
    exitPrice: parseFloat(t[col('exit_price')]) || 0,
    pnl: parseFloat(t[col('pnl')]) || 0
  })).filter(t => !isNaN(t.pnl));

  if (normalized.length === 0) {
    return getDefaultReport();
  }

  // --- Basic Stats ---
  const totalTrades = normalized.length;
  const winners = normalized.filter(t => t.pnl > 0);
  const losers = normalized.filter(t => t.pnl < 0);
  const winRate = (winners.length / totalTrades) * 100;
  const totalPnL = normalized.reduce((s, t) => s + t.pnl, 0);
  const avgWin = winners.length ? winners.reduce((s, t) => s + t.pnl, 0) / winners.length : 0;
  const avgLoss = losers.length ? Math.abs(losers.reduce((s, t) => s + t.pnl, 0) / losers.length) : 0;

  // --- Detect Behavioral Patterns ---

  // 1. Revenge Trading: trades within short time of a loss
  const revengeScore = detectRevengeTrades(normalized);

  // 2. Overtrading: excessive number of trades per day
  const overtradingScore = detectOvertrading(normalized);

  // 3. Panic Exit: closing profitable positions with very small gains
  const panicExitScore = detectPanicExits(normalized, avgWin);

  // 4. Loss Aversion: holding losers too long
  const lossAversionScore = detectLossAversion(normalized);

  // 5. Overconfidence: increasing position size after wins
  const overconfidenceScore = detectOverconfidence(normalized);

  // --- Determine Trader Profile ---
  const profile = determineProfile({
    revengeScore,
    overtradingScore,
    panicExitScore,
    lossAversionScore,
    overconfidenceScore,
    winRate
  });

  // --- Feature Importance ---
  const features = computeFeatureImportance(normalized, {
    revengeScore,
    overtradingScore,
    panicExitScore,
    lossAversionScore,
    overconfidenceScore
  });

  // --- Loss Analysis ---
  const lossAnalysis = analyzeLosses(normalized, {
    revengeScore,
    overtradingScore,
    panicExitScore,
    lossAversionScore
  });

  // --- Future Risks & Recommendations ---
  const futureRisks = predictFutureRisks({
    revengeScore,
    overtradingScore,
    panicExitScore,
    lossAversionScore,
    overconfidenceScore
  });

  return {
    summary: {
      totalTrades,
      winRate: Math.round(winRate),
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0
    },
    profile,
    risks: {
      revengeTrade: Math.round(revengeScore),
      overtrading: Math.round(overtradingScore),
      panicExit: Math.round(panicExitScore),
      lossAversion: Math.round(lossAversionScore),
      overconfidence: Math.round(overconfidenceScore)
    },
    features,
    lossAnalysis,
    futureRisks
  };
}

// ============ Pattern Detection Functions ============

function detectRevengeTrades(trades) {
  let revengeCount = 0;

  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];

    // If previous trade was a loss and this trade happened on same date
    if (prev.pnl < 0 && prev.date === curr.date) {
      // Check if position size increased (sign of revenge)
      if (curr.quantity >= prev.quantity) {
        revengeCount++;
      }
      // Or if trade happened shortly after
      const prevMinutes = timeToMinutes(prev.time);
      const currMinutes = timeToMinutes(curr.time);
      if (currMinutes - prevMinutes < 15 && currMinutes > prevMinutes) {
        revengeCount++;
      }
    }
  }

  const rate = (revengeCount / Math.max(trades.length - 1, 1));
  return Math.min(rate * 400, 95); // Scale to 0-95
}

function detectOvertrading(trades) {
  // Count trades per day
  const dailyCounts = {};
  trades.forEach(t => {
    dailyCounts[t.date] = (dailyCounts[t.date] || 0) + 1;
  });

  const days = Object.values(dailyCounts);
  const avgPerDay = days.reduce((s, d) => s + d, 0) / days.length;

  // More than 5 trades/day is considered overtrading
  if (avgPerDay > 10) return 90;
  if (avgPerDay > 7) return 75;
  if (avgPerDay > 5) return 60;
  if (avgPerDay > 3) return 40;
  return 20;
}

function detectPanicExits(trades, avgWin) {
  if (avgWin === 0) return 15;

  // Count trades where profit was less than 20% of average win
  const panicExits = trades.filter(t =>
    t.pnl > 0 && t.pnl < avgWin * 0.2
  ).length;

  const rate = panicExits / Math.max(trades.filter(t => t.pnl > 0).length, 1);
  return Math.min(rate * 200, 90);
}

function detectLossAversion(trades) {
  // Compare average magnitude of losses vs wins
  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);

  if (losers.length === 0 || winners.length === 0) return 10;

  const avgWinMag = winners.reduce((s, t) => s + t.pnl, 0) / winners.length;
  const avgLossMag = Math.abs(losers.reduce((s, t) => s + t.pnl, 0) / losers.length);

  // If average loss is much larger than average win, indicates holding losers
  const ratio = avgLossMag / Math.max(avgWinMag, 1);
  if (ratio > 3) return 85;
  if (ratio > 2) return 70;
  if (ratio > 1.5) return 55;
  if (ratio > 1) return 35;
  return 15;
}

function detectOverconfidence(trades) {
  let overconfidenceCount = 0;

  for (let i = 2; i < trades.length; i++) {
    const prev2 = trades[i - 2];
    const prev1 = trades[i - 1];
    const curr = trades[i];

    // After consecutive wins, position size increases significantly
    if (prev2.pnl > 0 && prev1.pnl > 0 && curr.quantity > prev1.quantity * 1.3) {
      overconfidenceCount++;
    }
  }

  const rate = overconfidenceCount / Math.max(trades.length - 2, 1);
  return Math.min(rate * 500, 90);
}

// ============ Profile Determination ============

function determineProfile(scores) {
  const profiles = [
    {
      type: 'Emotional Trader',
      emoji: '😤',
      description: 'You tend to let emotions drive your trading decisions, especially after losses. Your trading patterns show reactive behavior — entering positions based on frustration or excitement rather than analysis.',
      weight: scores.revengeScore * 0.4 + scores.panicExitScore * 0.3 + scores.lossAversionScore * 0.3
    },
    {
      type: 'Impulsive Trader',
      emoji: '⚡',
      description: 'You exhibit a pattern of rapid-fire trading with insufficient analysis. While your quick reflexes can be an asset, the frequency of trades suggests decisions made without adequate planning.',
      weight: scores.overtradingScore * 0.5 + scores.revengeScore * 0.3 + scores.overconfidenceScore * 0.2
    },
    {
      type: 'Fear-Driven Trader',
      emoji: '😰',
      description: 'Your trading shows signs of fear-based decision making. You tend to exit winning positions too early and hold losing positions hoping they\'ll recover, missing optimal exit points.',
      weight: scores.panicExitScore * 0.4 + scores.lossAversionScore * 0.4 + scores.revengeScore * 0.2
    },
    {
      type: 'Overconfident Trader',
      emoji: '🎯',
      description: 'After winning streaks, you tend to increase position sizes and take on more risk. While confidence is good, overconfidence leads to outsized losses when the market turns.',
      weight: scores.overconfidenceScore * 0.5 + scores.overtradingScore * 0.3 + scores.revengeScore * 0.2
    },
    {
      type: 'Disciplined Trader',
      emoji: '🧘',
      description: 'Your trading patterns show relatively consistent behavior with moderate risk management. Continue refining your approach and maintaining emotional control.',
      weight: 100 - (scores.revengeScore * 0.25 + scores.overtradingScore * 0.25 + scores.panicExitScore * 0.25 + scores.lossAversionScore * 0.25)
    }
  ];

  // Sort by weight, highest first
  profiles.sort((a, b) => b.weight - a.weight);
  const best = profiles[0];

  // Confidence is based on how dominant the top profile is
  const totalWeight = profiles.reduce((s, p) => s + Math.max(p.weight, 0), 0);
  const confidence = Math.min(Math.round((best.weight / Math.max(totalWeight, 1)) * 100 * 2.5), 95);

  return {
    type: best.type,
    emoji: best.emoji,
    description: best.description,
    confidence: Math.max(confidence, 55)
  };
}

// ============ Feature Importance ============

function computeFeatureImportance(trades, scores) {
  const features = [
    { name: 'Loss Streak Frequency', importance: 0, description: 'How often consecutive losses occur' },
    { name: 'Avg Hold Duration', importance: 0, description: 'Average time positions are held' },
    { name: 'Position Size Variance', importance: 0, description: 'How much position sizes fluctuate' },
    { name: 'Trade Frequency / Day', importance: 0, description: 'Number of trades executed per day' },
    { name: 'Win/Loss Ratio', importance: 0, description: 'Ratio of winning to losing trades' },
    { name: 'Post-Loss Behavior', importance: 0, description: 'How trading changes after a loss' },
    { name: 'Profit Taking Speed', importance: 0, description: 'How quickly profits are taken' }
  ];

  // Compute loss streaks
  let maxStreak = 0, currentStreak = 0;
  trades.forEach(t => {
    if (t.pnl < 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else { currentStreak = 0; }
  });
  features[0].importance = Math.min(maxStreak * 15, 95);

  // Position size variance
  const quantities = trades.map(t => t.quantity);
  const avgQty = quantities.reduce((s, q) => s + q, 0) / quantities.length;
  const variance = quantities.reduce((s, q) => s + Math.pow(q - avgQty, 2), 0) / quantities.length;
  const cv = Math.sqrt(variance) / Math.max(avgQty, 1);
  features[2].importance = Math.min(cv * 150, 90);

  // Trade frequency
  features[3].importance = Math.min(scores.overtradingScore * 1.1, 92);

  // Win/loss ratio
  const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
  features[4].importance = Math.abs(50 - winRate * 100) + 30;

  // Post-loss behavior
  features[5].importance = Math.min(scores.revengeScore * 1.05, 93);

  // Profit taking speed
  features[6].importance = Math.min(scores.panicExitScore * 1.1, 88);

  // Hold duration (estimated)
  features[1].importance = 40 + Math.random() * 30;

  // Sort by importance
  features.sort((a, b) => b.importance - a.importance);

  // Normalize to 0-100
  const max = features[0].importance;
  features.forEach(f => {
    f.importance = Math.round((f.importance / Math.max(max, 1)) * 100);
  });

  return features;
}

// ============ Loss Analysis ============

function analyzeLosses(trades, scores) {
  const lossTrades = trades.filter(t => t.pnl < 0);
  const totalLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));

  if (totalLoss === 0) {
    return {
      causes: [
        { name: 'No significant losses', percentage: 100, color: '#34d399' }
      ]
    };
  }

  // Attribute losses to behavioral causes (estimated)
  const emotionalWeight = (scores.revengeScore + scores.panicExitScore) / 2;
  const overleverageWeight = scores.overconfidenceScore;
  const timingWeight = scores.overtradingScore;
  const holdingWeight = scores.lossAversionScore;

  const totalWeight = emotionalWeight + overleverageWeight + timingWeight + holdingWeight;

  const causes = [
    {
      name: 'Emotional Exits',
      percentage: Math.round((emotionalWeight / totalWeight) * 100),
      color: '#ef5350',
      amount: Math.round((emotionalWeight / totalWeight) * totalLoss * 100) / 100
    },
    {
      name: 'Overleveraging',
      percentage: Math.round((overleverageWeight / totalWeight) * 100),
      color: '#ff9800',
      amount: Math.round((overleverageWeight / totalWeight) * totalLoss * 100) / 100
    },
    {
      name: 'Poor Timing',
      percentage: Math.round((timingWeight / totalWeight) * 100),
      color: '#7c5cfc',
      amount: Math.round((timingWeight / totalWeight) * totalLoss * 100) / 100
    },
    {
      name: 'Holding Losers',
      percentage: Math.round((holdingWeight / totalWeight) * 100),
      color: '#42a5f5',
      amount: Math.round((holdingWeight / totalWeight) * totalLoss * 100) / 100
    }
  ];

  // Normalize percentages to 100
  const percentTotal = causes.reduce((s, c) => s + c.percentage, 0);
  if (percentTotal !== 100) {
    causes[0].percentage += (100 - percentTotal);
  }

  return { causes, totalLoss: Math.round(totalLoss * 100) / 100 };
}

// ============ Future Risk Predictions ============

function predictFutureRisks(scores) {
  const risks = [
    { label: 'Revenge Trading', score: scores.revengeScore },
    { label: 'Overtrading', score: scores.overtradingScore },
    { label: 'Panic Exits', score: scores.panicExitScore },
    { label: 'Loss Aversion', score: scores.lossAversionScore },
    { label: 'Overconfidence', score: scores.overconfidenceScore }
  ];

  const recommendations = [];

  if (scores.revengeScore > 50) {
    recommendations.push({
      severity: 'danger',
      icon: '🔥',
      title: 'High Revenge Trading Risk',
      text: 'After a loss, take a mandatory 30-minute break before placing your next trade. Consider setting a daily loss limit.'
    });
  }

  if (scores.overtradingScore > 50) {
    recommendations.push({
      severity: 'warning',
      icon: '⚡',
      title: 'Overtrading Pattern Detected',
      text: 'Limit yourself to a maximum of 5 trades per day. Quality over quantity will improve your win rate significantly.'
    });
  }

  if (scores.panicExitScore > 40) {
    recommendations.push({
      severity: 'warning',
      icon: '😰',
      title: 'Premature Profit Taking',
      text: 'Use trailing stop losses instead of manual exits. Let winners run by moving your stop to breakeven after initial profit.'
    });
  }

  if (scores.lossAversionScore > 50) {
    recommendations.push({
      severity: 'danger',
      icon: '📉',
      title: 'Loss Aversion Behavior',
      text: 'Set hard stop losses on every trade and honor them. Your average loss is significantly larger than your average win.'
    });
  }

  if (scores.overconfidenceScore > 50) {
    recommendations.push({
      severity: 'warning',
      icon: '🎲',
      title: 'Overconfidence After Wins',
      text: 'Keep position sizes consistent regardless of recent performance. Don\'t increase risk after a winning streak.'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'info',
      icon: '✅',
      title: 'Relatively Stable Patterns',
      text: 'Your trading patterns are relatively consistent. Continue maintaining discipline and review your journal regularly.'
    });
  }

  return { risks, recommendations };
}

// ============ Helpers ============

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
}

function getDefaultReport() {
  return {
    summary: { totalTrades: 0, winRate: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 },
    profile: {
      type: 'Unknown',
      emoji: '❓',
      description: 'Insufficient data to determine a trading profile.',
      confidence: 0
    },
    risks: { revengeTrade: 0, overtrading: 0, panicExit: 0, lossAversion: 0, overconfidence: 0 },
    features: [],
    lossAnalysis: { causes: [], totalLoss: 0 },
    futureRisks: { risks: [], recommendations: [] }
  };
}
