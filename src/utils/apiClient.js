/**
 * apiClient.js — Calls the FastAPI backend and maps the response
 * to the shape expected by the TradePsych AI frontend report page.
 *
 * Backend returns (AnalysisReport):
 *   trader_profile, behavioral_risks, feature_importance,
 *   loss_analysis, future_risks, summary_stats
 *
 * Frontend expects:
 *   profile, risks, features, lossAnalysis, futureRisks, summary
 */

const API_BASE = 'http://localhost:8000/api/v1';

// Chart colors for loss analysis pie slices
const LOSS_COLORS = [
  '#ef5350', '#ff9800', '#7c5cfc', '#42a5f5',
  '#26c6da', '#66bb6a', '#ab47bc', '#ec407a'
];

// Profile type → emoji mapping
const PROFILE_EMOJI = {
  'Emotional Trader':    '😤',
  'Impulsive Trader':    '⚡',
  'Fear-Driven Trader':  '😰',
  'Risk-Averse Trader':  '😰',
  'Overconfident Trader':'🎯',
  'Disciplined Trader':  '🧘',
};

// Severity mapping for recommendation cards
const LIKELIHOOD_SEVERITY = {
  high:   'danger',
  medium: 'warning',
  low:    'info',
};

// Risk icons per pattern keyword
function getRiskIcon(pattern = '') {
  const p = pattern.toLowerCase();
  if (p.includes('revenge'))       return '🔥';
  if (p.includes('overtrad'))      return '⚡';
  if (p.includes('panic') || p.includes('premature')) return '😰';
  if (p.includes('escalat') || p.includes('confident')) return '🎯';
  if (p.includes('loss') || p.includes('aversion'))    return '📉';
  if (p.includes('fomo'))          return '🏃';
  return '⚠️';
}

/**
 * Upload a File object to the backend and return the mapped frontend report.
 *
 * @param {File} file - The CSV/Excel file selected by the user
 * @returns {Promise<object>} - Frontend-shaped report object
 */
export async function analyzeWithAPI(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const api = await response.json();
  return mapApiResponseToReport(api);
}

/**
 * Map the FastAPI AnalysisReport shape → frontend report shape.
 *
 * @param {object} api - Raw API response
 * @returns {object} - Frontend report object
 */
function mapApiResponseToReport(api) {
  // ── Trader Profile ────────────────────────────────────────────────
  const profileType = api.trader_profile?.type || 'Unknown';
  const profile = {
    type:        profileType,
    emoji:       PROFILE_EMOJI[profileType] || '🧠',
    description: api.trader_profile?.description || '',
    confidence:  api.trader_profile?.confidence ?? 0,
  };

  // ── Behavioral Risks ──────────────────────────────────────────────
  // Backend returns an array sorted by score; map to the keyed object
  // the frontend risk section expects.
  const risksByName = {};
  (api.behavioral_risks || []).forEach(r => {
    risksByName[r.name.toLowerCase()] = r.score;
  });

  const risks = {
    revengeTrade:   risksByName['revenge trading']               ?? 0,
    overtrading:    risksByName['overtrading']                   ?? 0,
    panicExit:      risksByName['panic exit']                    ?? 0,
    lossAversion:   risksByName['loss aversion']
                    ?? risksByName['emotional trading']          ?? 0,
    overconfidence: risksByName['overconfidence']                ?? 0,
  };

  // ── Feature Importance ────────────────────────────────────────────
  // Backend gives up to 5 SHAP-ranked features; map to {name, importance}
  const impactWeight = { high: 100, medium: 65, low: 35 };
  const features = (api.feature_importance || []).map(f => ({
    name:       f.display_name,
    importance: impactWeight[f.impact] ?? 50,
    value:      f.value,
    threshold:  f.threshold,
    explanation: f.explanation,
  }));

  // Sort descending and normalise to 0-100 relative to top item
  features.sort((a, b) => b.importance - a.importance);
  const topImp = features[0]?.importance || 1;
  features.forEach(f => {
    f.importance = Math.round((f.importance / topImp) * 100);
  });

  // ── Loss Analysis ─────────────────────────────────────────────────
  const rawCauses = api.loss_analysis || [];
  const totalLossAbs = rawCauses.reduce(
    (s, c) => s + Math.abs(c.total_loss || 0), 0
  );

  const causes = rawCauses.map((c, i) => ({
    name:       c.cause,
    percentage: Math.round(c.percentage_of_total_loss ?? 0),
    color:      LOSS_COLORS[i % LOSS_COLORS.length],
    amount:     Math.abs(c.total_loss || 0),
  }));

  // Ensure percentages sum to 100
  if (causes.length > 0) {
    const pctSum = causes.reduce((s, c) => s + c.percentage, 0);
    if (pctSum !== 100 && pctSum > 0) {
      causes[0].percentage += (100 - pctSum);
    }
  }

  const lossAnalysis = { causes, totalLoss: Math.round(totalLossAbs * 100) / 100 };

  // ── Future Risks & Recommendations ────────────────────────────────
  const apiRisks = api.future_risks || [];

  // Radar chart data: one point per future risk pattern
  const radarRisks = apiRisks.map(r => ({
    label: r.pattern.length > 28 ? r.pattern.slice(0, 28) + '…' : r.pattern,
    score: r.likelihood === 'high' ? 80 : r.likelihood === 'medium' ? 50 : 25,
  }));

  // Recommendation cards
  const recommendations = apiRisks.map(r => ({
    severity: LIKELIHOOD_SEVERITY[r.likelihood] || 'info',
    icon:     getRiskIcon(r.pattern),
    title:    r.pattern,
    text:     r.recommendation,
  }));

  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'info',
      icon:     '✅',
      title:    'Relatively Stable Patterns',
      text:     'No strong recurring behavioral risks predicted. Continue maintaining discipline.',
    });
  }

  const futureRisks = { risks: radarRisks, recommendations };

  // ── Summary Stats ─────────────────────────────────────────────────
  const s = api.summary_stats || {};
  const summary = {
    totalTrades:  s.total_trades         ?? 0,
    winRate:      Math.round(s.win_rate  ?? 0),
    totalPnL:     Math.round((s.total_pnl ?? 0) * 100) / 100,
    avgWin:       Math.round((s.largest_win ?? 0) * 100) / 100,
    avgLoss:      Math.round(Math.abs(s.largest_loss ?? 0) * 100) / 100,
    profitFactor: s.profit_factor        ?? 0,
  };

  return { profile, risks, features, lossAnalysis, futureRisks, summary };
}
