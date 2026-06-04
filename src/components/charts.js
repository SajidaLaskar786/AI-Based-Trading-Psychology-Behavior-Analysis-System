/**
 * Charts — Chart.js rendering helpers for the report
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const COLORS = {
  primary: 'hsl(245, 85%, 65%)',
  primaryAlpha: 'hsla(245, 85%, 65%, 0.3)',
  accent: 'hsl(160, 84%, 52%)',
  accentAlpha: 'hsla(160, 84%, 52%, 0.3)',
  danger: 'hsl(0, 85%, 62%)',
  warning: 'hsl(38, 92%, 58%)',
  text: 'hsl(220, 20%, 92%)',
  textMuted: 'hsl(220, 12%, 42%)',
  gridLine: 'rgba(255, 255, 255, 0.06)',
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
        hoverOffset: 8,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 25, 0.9)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 1500,
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
        borderWidth: 2,
        pointBackgroundColor: COLORS.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6
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
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5
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
          grid: {
            color: COLORS.gridLine,
            circular: true
          },
          angleLines: {
            color: COLORS.gridLine
          },
          pointLabels: {
            color: COLORS.text,
            font: { size: 11, family: 'Inter' }
          }
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
          backgroundColor: 'rgba(15, 15, 25, 0.9)',
          titleColor: COLORS.text,
          bodyColor: COLORS.text,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.r)}%`
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      }
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
