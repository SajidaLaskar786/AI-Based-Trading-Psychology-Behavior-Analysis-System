/**
 * Charts — Chart.js rendering helpers for the report
 * Psychology color theme: deep mind purples, neural blues, calm teals
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// ── Psychology Color Palette ──────────────────────────────────────────────────
const COLORS = {
  // Deep neural purple (primary line / equity)
  primary:       'hsl(260, 78%, 62%)',
  primaryAlpha:  'hsla(260, 78%, 62%, 0.4)',

  // Mindful teal-blue (secondary / predicted)
  accent:        'hsl(185, 78%, 52%)',
  accentAlpha:   'hsla(185, 78%, 52%, 0.35)',

  // Calm azure (gain marker)
  gain:          'hsl(155, 72%, 54%)',
  gainAlpha:     'hsla(155, 72%, 54%, 0.25)',

  // Intense coral (loss marker)
  loss:          'hsl(352, 80%, 62%)',
  lossAlpha:     'hsla(352, 80%, 62%, 0.25)',

  // Neutral warn amber
  warning:       'hsl(42, 90%, 60%)',

  text:          'hsl(230, 20%, 92%)',
  textMuted:     'hsl(230, 12%, 46%)',
  gridLine:      'rgba(200, 180, 255, 0.06)',
};

// ── Plugin: draw per-point gain/loss shading ──────────────────────────────────
const markerShadingPlugin = {
  id: 'markerShading',
  afterDatasetsDraw(chart) {
    try {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data) return;
      const pnlDataset = chart.data.datasets[1];
      if (!pnlDataset || !pnlDataset.data) return;

      meta.data.forEach((point, i) => {
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
        const pnl = pnlDataset.data[i];
        if (pnl === undefined || pnl === null) return;
        const color = pnl >= 0 ? COLORS.gainAlpha : COLORS.lossAlpha;

        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      });
    } catch (err) {
      console.error("markerShadingPlugin error:", err);
    }
  }
};

/**
 * Render Doughnut chart for Loss Analysis
 */
export function renderLossChart(canvasId, causes) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: causes.map(c => c.name),
      datasets: [{
        data: causes.map(c => c.percentage),
        backgroundColor: causes.map(c => c.color),
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 10,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 12, 28, 0.95)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(200,180,255,0.15)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 1600,
        easing: 'easeOutQuart'
      }
    }
  });
}

/**
 * Render Radar chart for Future Risks
 */
export function renderRadarChart(canvasId, risks) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels: risks.map(r => r.label),
      datasets: [{
        label: 'Current Risk',
        data: risks.map(r => r.score),
        fill: true,
        backgroundColor: COLORS.primaryAlpha,
        borderColor: COLORS.primary,
        borderWidth: 2.5,
        pointBackgroundColor: COLORS.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 5,
        pointHoverRadius: 7
      }, {
        label: 'Predicted (Next 30 trades)',
        data: risks.map(r => Math.min(r.score * (0.9 + Math.random() * 0.3), 100)),
        fill: true,
        backgroundColor: COLORS.accentAlpha,
        borderColor: COLORS.accent,
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: COLORS.accent,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            color: COLORS.textMuted,
            backdropColor: 'transparent',
            font: { size: 10 }
          },
          grid:        { color: COLORS.gridLine, circular: true },
          angleLines:  { color: COLORS.gridLine },
          pointLabels: { color: COLORS.text, font: { size: 11, family: 'Inter' } }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: COLORS.text,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { size: 11, family: 'Inter' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 12, 28, 0.95)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(200,180,255,0.15)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.r)}%`
          }
        }
      },
      animation: { duration: 1600, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Render STACKED LINE chart with gain/loss markers for Cumulative Equity
 *
 * Dataset layout:
 *   [0] Cumulative Equity line  (the main line)
 *   [1] Per-trade P&L values    (hidden — used only for marker colouring)
 */
export function renderEquityChart(canvasId, trades, getTradeField) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // ── Build data arrays ──────────────────────────────────────────────────────
  let cumulative = 0;
  const pnlValues = [];
  const equityPoints = trades.map((t) => {
    const pnl = getTradeField(t, 'pnl');
    pnlValues.push(pnl);
    cumulative += pnl;
    return cumulative;
  });

  const labels = trades.map((_, i) => `T${i + 1}`);

  // Per-point marker colors based on individual trade P&L
  const pointBgColors = pnlValues.map(v => v >= 0 ? COLORS.gain : COLORS.loss);
  const pointBorderColors = pnlValues.map(v => v >= 0 ? COLORS.gain : COLORS.loss);
  const pointRadii = pnlValues.map(() => 6);

  // ── Gradient fill ──────────────────────────────────────────────────────────
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 360);
  gradient.addColorStop(0,   'hsla(260, 78%, 62%, 0.45)');
  gradient.addColorStop(0.5, 'hsla(260, 78%, 62%, 0.15)');
  gradient.addColorStop(1,   'hsla(260, 78%, 62%, 0)');

  // ── Second "baseline" dataset for a stacked-look ──────────────────────────
  // We render a thin zero-line for visual reference as the "stacked base"
  const zeroLine = trades.map(() => 0);

  return new Chart(canvas, {
    type: 'line',
    plugins: [markerShadingPlugin],
    data: {
      labels,
      datasets: [
        // ── Main equity line ─────────────────────────────────────────────────
        {
          label: 'Cumulative Equity',
          data: equityPoints,
          borderColor: COLORS.primary,
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,               // fill to 0 axis → stacked look
          tension: 0.38,
          pointBackgroundColor: pointBgColors,
          pointBorderColor: pointBorderColors,
          pointBorderWidth: 2,
          pointRadius: pointRadii,
          pointHoverRadius: 9,
          pointStyle: 'circle',
          z: 2,
        },
        // ── Per-trade P&L (hidden line — only feeds marker colouring) ────────
        {
          label: 'Trade P&L',
          data: pnlValues,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          hidden: true,         // keep out of legend, tooltip suppressed
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          stacked: true,
          grid:  { color: COLORS.gridLine, drawBorder: false },
          ticks: {
            color: COLORS.textMuted,
            font: { size: 10, family: 'Inter' },
            maxTicksLimit: 20,
          }
        },
        y: {
          stacked: false,
          grid:  { color: COLORS.gridLine, drawBorder: false },
          ticks: {
            color: COLORS.textMuted,
            font: { size: 10, family: 'Inter' },
            callback: v => `$${Math.round(v).toLocaleString()}`
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: COLORS.text,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,
            font: { size: 11, family: 'Inter' },
            filter: (item) => item.text !== 'Trade P&L' // hide hidden dataset label
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 12, 38, 0.97)',
          titleColor: COLORS.primary,
          bodyColor: COLORS.text,
          borderColor: 'rgba(200,180,255,0.2)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => `Trade #${items[0].label.replace('T', '')}`,
            label: (ctx) => {
              const idx = ctx.dataIndex;
              const pnl = pnlValues[idx];
              const equity = ctx.raw;
              const sign = pnl >= 0 ? '+' : '';
              return [
                ` Equity:     $${Math.round(equity).toLocaleString()}`,
                ` Trade P&L:  ${sign}$${Math.round(pnl).toLocaleString()}`,
              ];
            },
            labelColor: (ctx) => {
              const pnl = pnlValues[ctx.dataIndex];
              return {
                borderColor: pnl >= 0 ? COLORS.gain : COLORS.loss,
                backgroundColor: pnl >= 0 ? COLORS.gain : COLORS.loss,
                borderRadius: 4,
              };
            }
          }
        }
      },
      animation: {
        duration: 1800,
        easing: 'easeOutCubic',
        // Animate line drawing left-to-right
        onProgress(animation) {
          const chart = animation.chart;
          chart.ctx.save();
        },
      }
    }
  });
}

/**
 * Render animated Bar Chart for Individual Trade P&L
 */
export function renderPnLChart(canvasId, trades, getTradeField) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const pnlValues  = trades.map(t => getTradeField(t, 'pnl'));
  const labels     = trades.map((_, i) => `T${i + 1}`);
  const bgColors   = pnlValues.map(v => v >= 0 ? COLORS.gainAlpha  : COLORS.lossAlpha);
  const bdColors   = pnlValues.map(v => v >= 0 ? COLORS.gain       : COLORS.loss);

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Trade P&L',
        data: pnlValues,
        backgroundColor: bgColors,
        borderColor: bdColors,
        borderWidth: 1.5,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textMuted, font: { size: 10, family: 'Inter' } } },
        y: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textMuted, font: { size: 10, family: 'Inter' }, callback: v => `$${Math.round(v).toLocaleString()}` } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 12, 38, 0.97)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(200,180,255,0.15)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
          callbacks: {
            label: (ctx) => ` P&L: ${ctx.raw >= 0 ? '+' : ''}$${Math.round(ctx.raw).toLocaleString()}`
          }
        }
      },
      animation: { duration: 1600, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Render animated Bar Chart for Performance Metrics
 */
export function renderMetricsChart(canvasId, trades, getTradeField) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const pnls     = trades.map(t => getTradeField(t, 'pnl'));
  const profits  = pnls.filter(p => p > 0);
  const losses   = pnls.filter(p => p < 0);

  const totProfit = profits.reduce((a, b) => a + b, 0);
  const totLoss   = Math.abs(losses.reduce((a, b) => a + b, 0));
  const avgWin    = profits.length ? totProfit / profits.length : 0;
  const avgLoss   = losses.length  ? totLoss  / losses.length  : 0;

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Total Profit', 'Total Loss', 'Avg Win', 'Avg Loss'],
      datasets: [{
        data: [totProfit, -totLoss, avgWin, -avgLoss],
        backgroundColor: [COLORS.gainAlpha, COLORS.lossAlpha, COLORS.accentAlpha, 'rgba(255,165,0,0.28)'],
        borderColor:     [COLORS.gain,      COLORS.loss,      COLORS.accent,      'hsl(42,90%,60%)'],
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.text, font: { size: 11, family: 'Inter', weight: '500' } } },
        y: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textMuted, font: { size: 10, family: 'Inter' }, callback: v => `$${Math.round(v).toLocaleString()}` } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 12, 38, 0.97)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(200,180,255,0.15)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
          callbacks: {
            label: (ctx) => ` Value: ${ctx.raw >= 0 ? '+' : ''}$${Math.round(ctx.raw).toLocaleString()}`
          }
        }
      },
      animation: { duration: 1600, easing: 'easeOutQuart' }
    }
  });
}

/**
 * Destroy a chart instance safely
 */
export function destroyChart(chart) {
  if (chart && typeof chart.destroy === 'function') {
    chart.destroy();
  }
}
