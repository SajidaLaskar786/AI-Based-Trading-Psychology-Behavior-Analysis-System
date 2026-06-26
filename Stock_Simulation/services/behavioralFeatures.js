// services/behavioralFeatures.js

// Helper to calculate standard deviation
function calculateStd(values, mean) {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 0.5), 0) / values.length; // Wait, std dev is squared diff
  // Let's write correct std dev:
  const sqDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSqDiff);
}

// Helper to calculate sum
function sumArray(values) {
  return values.reduce((sum, val) => sum + val, 0);
}

function extractFeatures(allTrades, currentSimDate) {
  // Sort trades by buyDate
  const trades = [...allTrades].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
  const closedTrades = trades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime());

  const totalTradesCount = trades.length;
  const closedTradesCount = closedTrades.length;

  // 1. Win Rate
  let win_rate = 0;
  if (closedTradesCount > 0) {
    const wins = closedTrades.filter(t => t.profit_loss > 0).length;
    win_rate = (wins / closedTradesCount) * 100;
  }

  // 2. Average Profit
  let avg_profit = 0;
  const winningTrades = closedTrades.filter(t => t.profit_loss > 0);
  if (winningTrades.length > 0) {
    avg_profit = sumArray(winningTrades.map(t => t.profit_loss)) / winningTrades.length;
  }

  // 3. Average Loss
  let avg_loss = 0;
  const losingTrades = closedTrades.filter(t => t.profit_loss < 0);
  if (losingTrades.length > 0) {
    avg_loss = Math.abs(sumArray(losingTrades.map(t => t.profit_loss))) / losingTrades.length;
  }

  // 4. Profit Factor
  let profit_factor = 0;
  const totalProfit = sumArray(winningTrades.map(t => t.profit_loss));
  const totalLoss = Math.abs(sumArray(losingTrades.map(t => t.profit_loss)));
  if (totalLoss === 0) {
    profit_factor = totalProfit > 0 ? 99.9 : 0;
  } else {
    profit_factor = totalProfit / totalLoss;
  }

  // 5. Average Return Percentage
  let avg_return_pct = 0;
  if (closedTradesCount > 0) {
    const returnPcts = closedTrades.map(t => ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100);
    avg_return_pct = sumArray(returnPcts) / closedTradesCount;
  }

  // 6. Average Holding Days
  let avg_holding_days = 0;
  const holdingPeriods = []; // in simulation days
  if (closedTradesCount > 0) {
    closedTrades.forEach(t => {
      const diffMs = new Date(t.sellDate).getTime() - new Date(t.buyDate).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      holdingPeriods.push(Math.max(0.001, diffDays)); // at least a fraction of a day
    });
    avg_holding_days = sumArray(holdingPeriods) / closedTradesCount;
  }

  // 7. Holding Variance
  let holding_variance = 0;
  if (closedTradesCount > 1) {
    holding_variance = calculateStd(holdingPeriods, avg_holding_days);
  }

  // Determine active session bounds in simulation time
  let sessionStartSim = currentSimDate;
  let sessionEndSim = currentSimDate;
  if (totalTradesCount > 0) {
    const dates = trades.map(t => new Date(t.buyDate).getTime());
    if (closedTradesCount > 0) {
      closedTrades.forEach(t => dates.push(new Date(t.sellDate).getTime()));
    }
    const minTime = Math.min(...dates);
    sessionStartSim = new Date(minTime);
  }

  const msElapsed = Math.max(1000, new Date(currentSimDate).getTime() - sessionStartSim.getTime());
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const monthsElapsed = daysElapsed / 30.4;

  // 8. Trades Per Month
  const trades_per_month = totalTradesCount / Math.max(0.1, monthsElapsed);

  // 9. Average Trades Per Day
  const avg_trades_per_day = totalTradesCount / Math.max(0.1, daysElapsed);

  // 10. Average Gap Between Trades (in days)
  let avg_gap_between_trades = 0;
  const gaps = [];
  if (closedTradesCount > 1) {
    // Sort closed trades by close time (sellDate)
    const sortedClosed = [...closedTrades].sort((a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime());
    for (let i = 1; i < sortedClosed.length; i++) {
      const prevSell = new Date(sortedClosed[i - 1].sellDate).getTime();
      const nextBuy = new Date(sortedClosed[i].buyDate).getTime();
      // Only count gap if next trade was opened after the previous was closed
      if (nextBuy > prevSell) {
        const gapMs = nextBuy - prevSell;
        gaps.push(gapMs / (1000 * 60 * 60 * 24));
      }
    }
    if (gaps.length > 0) {
      avg_gap_between_trades = sumArray(gaps) / gaps.length;
    }
  }

  // 11. Same Day Trade Ratio
  let same_day_trade_ratio = 0;
  if (closedTradesCount > 0) {
    const sameDayCount = closedTrades.filter(t => {
      const bDate = new Date(t.buyDate).toISOString().split('T')[0];
      const sDate = new Date(t.sellDate).toISOString().split('T')[0];
      return bDate === sDate;
    }).length;
    same_day_trade_ratio = (sameDayCount / closedTradesCount) * 100;
  }

  // 12. Average Position Size
  let avg_position_size = 0;
  const positionSizes = trades.map(t => t.buyValue);
  if (totalTradesCount > 0) {
    avg_position_size = sumArray(positionSizes) / totalTradesCount;
  }

  // 13. Position Size Variance
  let position_size_variance = 0;
  if (totalTradesCount > 1) {
    position_size_variance = calculateStd(positionSizes, avg_position_size);
  }

  // 14. Risk Escalation Ratio (position size after wins vs after losses)
  let risk_escalation_ratio = 1.0;
  const sizesAfterWins = [];
  const sizesAfterLosses = [];

  for (let i = 0; i < trades.length; i++) {
    const currentTrade = trades[i];
    const currentBuyTime = new Date(currentTrade.buyDate).getTime();

    // Find the most recently closed trade prior to currentTrade's entry
    let lastClosed = null;
    closedTrades.forEach(ct => {
      const ctSellTime = new Date(ct.sellDate).getTime();
      if (ctSellTime < currentBuyTime) {
        if (!lastClosed || new Date(ct.sellDate).getTime() > new Date(lastClosed.sellDate).getTime()) {
          lastClosed = ct;
        }
      }
    });

    if (lastClosed) {
      if (lastClosed.profit_loss > 0) {
        sizesAfterWins.push(currentTrade.buyValue);
      } else if (lastClosed.profit_loss < 0) {
        sizesAfterLosses.push(currentTrade.buyValue);
      }
    }
  }

  const avgWinEscalation = sizesAfterWins.length > 0 ? (sumArray(sizesAfterWins) / sizesAfterWins.length) : 0;
  const avgLossEscalation = sizesAfterLosses.length > 0 ? (sumArray(sizesAfterLosses) / sizesAfterLosses.length) : 0;

  if (avgWinEscalation > 0 && avgLossEscalation > 0) {
    risk_escalation_ratio = avgWinEscalation / avgLossEscalation;
  } else if (avgWinEscalation > 0 && avgLossEscalation === 0) {
    risk_escalation_ratio = 1.5; // defaulted to reflect positive shift
  } else if (avgWinEscalation === 0 && avgLossEscalation > 0) {
    risk_escalation_ratio = 0.5; // defaulted to reflect negative shift
  }

  // 15. Post Loss Position Change (average % change in size immediately after a loss)
  let post_loss_position_change = 0;
  const postLossChanges = [];
  
  trades.forEach(t => {
    // If trade was entered after a loss
    const tBuyTime = new Date(t.buyDate).getTime();
    let lastClosed = null;
    closedTrades.forEach(ct => {
      const ctSellTime = new Date(ct.sellDate).getTime();
      if (ctSellTime < tBuyTime) {
        if (!lastClosed || new Date(ct.sellDate).getTime() > new Date(lastClosed.sellDate).getTime()) {
          lastClosed = ct;
        }
      }
    });

    if (lastClosed && lastClosed.profit_loss < 0) {
      const sizeDiffPct = ((t.buyValue - lastClosed.buyValue) / lastClosed.buyValue) * 100;
      postLossChanges.push(sizeDiffPct);
    }
  });

  if (postLossChanges.length > 0) {
    post_loss_position_change = sumArray(postLossChanges) / postLossChanges.length;
  }

  // 16. Post Loss Trade Delay
  let post_loss_trade_delay = 0;
  const postLossDelays = [];

  trades.forEach(t => {
    const tBuyTime = new Date(t.buyDate).getTime();
    let lastClosed = null;
    closedTrades.forEach(ct => {
      const ctSellTime = new Date(ct.sellDate).getTime();
      if (ctSellTime < tBuyTime) {
        if (!lastClosed || new Date(ct.sellDate).getTime() > new Date(lastClosed.sellDate).getTime()) {
          lastClosed = ct;
        }
      }
    });

    if (lastClosed && lastClosed.profit_loss < 0) {
      const delayMs = tBuyTime - new Date(lastClosed.sellDate).getTime();
      postLossDelays.push(delayMs / (1000 * 60 * 60 * 24)); // delay in simulation days
    }
  });

  if (postLossDelays.length > 0) {
    post_loss_trade_delay = sumArray(postLossDelays) / postLossDelays.length;
  }

  // 17. PNL Standard Deviation
  let pnl_std = 0;
  if (closedTradesCount > 0) {
    const pnls = closedTrades.map(t => t.profit_loss);
    const avgPnl = sumArray(pnls) / closedTradesCount;
    pnl_std = calculateStd(pnls, avgPnl);
  }

  // 18. Max Win Streak
  let max_win_streak = 0;
  let currentWinStreak = 0;
  closedTrades.forEach(t => {
    if (t.profit_loss > 0) {
      currentWinStreak++;
      max_win_streak = Math.max(max_win_streak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }
  });

  // 19. Max Loss Streak
  let max_loss_streak = 0;
  let currentLossStreak = 0;
  closedTrades.forEach(t => {
    if (t.profit_loss < 0) {
      currentLossStreak++;
      max_loss_streak = Math.max(max_loss_streak, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  });

  return {
    win_rate: parseFloat(win_rate.toFixed(2)),
    avg_profit: parseFloat(avg_profit.toFixed(2)),
    avg_loss: parseFloat(avg_loss.toFixed(2)),
    profit_factor: parseFloat(profit_factor.toFixed(2)),
    avg_return_pct: parseFloat(avg_return_pct.toFixed(2)),
    avg_holding_days: parseFloat(avg_holding_days.toFixed(4)),
    holding_variance: parseFloat(holding_variance.toFixed(4)),
    trades_per_month: parseFloat(trades_per_month.toFixed(2)),
    avg_trades_per_day: parseFloat(avg_trades_per_day.toFixed(2)),
    avg_gap_between_trades: parseFloat(avg_gap_between_trades.toFixed(4)),
    same_day_trade_ratio: parseFloat(same_day_trade_ratio.toFixed(2)),
    avg_position_size: parseFloat(avg_position_size.toFixed(2)),
    position_size_variance: parseFloat(position_size_variance.toFixed(2)),
    risk_escalation_ratio: parseFloat(risk_escalation_ratio.toFixed(2)),
    post_loss_position_change: parseFloat(post_loss_position_change.toFixed(2)),
    post_loss_trade_delay: parseFloat(post_loss_trade_delay.toFixed(4)),
    pnl_std: parseFloat(pnl_std.toFixed(2)),
    max_win_streak,
    max_loss_streak
  };
}

module.exports = {
  extractFeatures
};
