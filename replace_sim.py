import re

with open("src/pages/simulation.js", "r") as f:
    content = f.read()

# Replace generate-report-btn logic
old_btn_logic = """  // Generate Report Button
  const genReportBtn = document.getElementById('generate-report-btn');
  genReportBtn.addEventListener('click', async () => {
    genReportBtn.disabled = true;
    genReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing Behavior Model...';
    
    try {
      const report = await API.generatePsychologyReport(currentUser);
      showToast(' trader psychology report compiled successfully!', 'success');
      renderPsychologyReport(report);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      genReportBtn.disabled = false;
      genReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Psychology Diagnostics Report';
    }
  });"""

new_btn_logic = """  // Generate Report Button
  const genReportBtn = document.getElementById('generate-report-btn');
  if (genReportBtn) {
    genReportBtn.addEventListener('click', async () => {
      genReportBtn.disabled = true;
      genReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing Behavior Model...';
      
      try {
        const data = await API.getPortfolio(currentUser);
        const closedTrades = data.closedPositions || [];
        if (closedTrades.length === 0) {
          throw new Error('No closed trades available to analyze. Please execute and close some trades first.');
        }
        
        let csv = "symbol,quantity,buy_date,sell_date,buy_price,sell_price\\n";
        closedTrades.forEach(p => {
          // Normalize dates slightly to avoid parsing issues if needed, but the backend accepts standard ISO
          csv += `${p.symbol},${p.quantity},${p.buyDate},${p.sellDate},${p.buyPrice},${p.sellPrice}\\n`;
        });
        
        const formData = new FormData();
        const blob = new Blob([csv], { type: 'text/csv' });
        formData.append('file', blob, 'trades.csv');
        
        const res = await fetch('/api/v1/analyze', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to generate psychology report from ML backend');
        }
        const report = await res.json();
        
        showToast('Trader psychology report compiled successfully using ML backend!', 'success');
        renderPsychologyReport(report);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        genReportBtn.disabled = false;
        genReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Psychology Diagnostics Report';
      }
    });
  }"""

content = content.replace(old_btn_logic, new_btn_logic)

# Replace renderPsychologyReport
old_render_start = "// Render AI psychology report"
old_render_end = "    metricsTbody.appendChild(tr);\n  });\n}"

# We will use regex to find the entire renderPsychologyReport function and replace it.
pattern = re.compile(r'// Render AI psychology report\nfunction renderPsychologyReport\(r\) \{.*?(?=\n// Gamification Animation Helpers)', re.DOTALL)

new_render_logic = """// Render AI psychology report using FastAPI dynamic ML response
function renderPsychologyReport(r) {
  const container = document.getElementById('report-view-container');
  if (container) container.classList.remove('hidden');

  const createDate = new Date();
  const dateEl = document.getElementById('report-date');
  if (dateEl) dateEl.innerText = `Diagnostic Code: ML-DYNAMIC | Compiled: ${createDate.toLocaleDateString()} ${createDate.toLocaleTimeString()}`;

  const overallScore = r.trader_profile.confidence || 0;
  const strokeOffset = 314.15 - (314.15 * (overallScore / 100));
  const progressRing = document.getElementById('score-ring-progress');
  if (progressRing) progressRing.style.strokeDashoffset = strokeOffset;
  
  const scoreValEl = document.getElementById('report-score-val');
  if (scoreValEl) scoreValEl.innerText = overallScore;
  
  if (overallScore >= 70) {
    if (progressRing) progressRing.style.stroke = '#10b981';
  } else if (overallScore >= 45) {
    if (progressRing) progressRing.style.stroke = '#f59e0b';
  } else {
    if (progressRing) progressRing.style.stroke = '#ef4444';
  }

  const traderTypeEl = document.getElementById('report-trader-type');
  if (traderTypeEl) traderTypeEl.innerText = r.trader_profile.type;
  
  const summaryTextEl = document.getElementById('report-summary-text');
  if (summaryTextEl) summaryTextEl.innerText = r.trader_profile.description;

  // Populate the score breakdown (mocking sub-scores as overall score since ML doesn't segment them natively)
  if (document.getElementById('score-discipline')) document.getElementById('score-discipline').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-discipline')) document.getElementById('score-bar-discipline').style.width = `${overallScore}%`;
  if (document.getElementById('score-emotional')) document.getElementById('score-emotional').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-emotional')) document.getElementById('score-bar-emotional').style.width = `${overallScore}%`;
  if (document.getElementById('score-risk')) document.getElementById('score-risk').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-risk')) document.getElementById('score-bar-risk').style.width = `${overallScore}%`;
  if (document.getElementById('score-consistency')) document.getElementById('score-consistency').innerText = `${overallScore}/100`;
  if (document.getElementById('score-bar-consistency')) document.getElementById('score-bar-consistency').style.width = `${overallScore}%`;

  // Strengths (Use summary stats)
  const strengthsContainer = document.getElementById('report-strengths-container');
  if (strengthsContainer) {
    strengthsContainer.innerHTML = '';
    const sDiv = document.createElement('div');
    sDiv.className = 'sw-item';
    sDiv.innerHTML = `
      <i class="fa-solid fa-circle-check sw-icon text-success"></i>
      <div class="sw-content">
        <h5>Win Rate <span class="sw-metric-badge">${r.summary_stats.win_rate.toFixed(1)}%</span></h5>
        <p>Total profitable trades: ${r.summary_stats.winning_trades} out of ${r.summary_stats.total_trades}</p>
      </div>
    `;
    strengthsContainer.appendChild(sDiv);
  }

  // Weaknesses (Use behavioral risks or loss causes)
  const weaknessesContainer = document.getElementById('report-weaknesses-container');
  if (weaknessesContainer) {
    weaknessesContainer.innerHTML = '';
    (r.behavioral_risks || []).slice(0, 3).forEach(w => {
      const div = document.createElement('div');
      div.className = 'sw-item';
      div.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation sw-icon text-danger"></i>
        <div class="sw-content">
          <h5>${w.name} <span class="sw-metric-badge">${w.score}/100</span></h5>
          <p>${w.description}</p>
        </div>
      `;
      weaknessesContainer.appendChild(div);
    });
    if ((r.behavioral_risks || []).length === 0) {
      weaknessesContainer.innerHTML = '<p class="text-muted text-sm mt-2">No critical behavioral risks detected.</p>';
    }
  }

  // Recommendations (Use future risks)
  const recsContainer = document.getElementById('report-recommendations-list');
  if (recsContainer) {
    recsContainer.innerHTML = '';
    (r.future_risks || []).forEach(rec => {
      const li = document.createElement('li');
      li.innerText = rec.recommendation;
      recsContainer.appendChild(li);
    });
    if ((r.future_risks || []).length === 0) {
      recsContainer.innerHTML = '<li class="text-muted">Maintain current discipline.</li>';
    }
  }

  // Top Drivers list
  const driversList = document.getElementById('report-drivers-list');
  if (driversList) {
    driversList.innerHTML = '';
    (r.feature_importance || []).slice(0, 5).forEach(d => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${d.display_name}</strong>: ${d.explanation}`;
      driversList.appendChild(li);
    });
  }

  // Detailed Metrics table
  const metricsTbody = document.getElementById('report-metrics-tbody');
  if (metricsTbody) {
    metricsTbody.innerHTML = '';
    (r.feature_importance || []).forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.display_name}</strong></td>
        <td class="text-right font-weight-bold">${row.value}</td>
        <td class="text-right text-muted">${row.threshold}</td>
        <td class="text-center"><span class="metric-category-tag">${row.impact} impact</span></td>
      `;
      metricsTbody.appendChild(tr);
    });
  }
}
"""

content = pattern.sub(new_render_logic, content)

with open("src/pages/simulation.js", "w") as f:
    f.write(content)

print("Replaced content in src/pages/simulation.js")
