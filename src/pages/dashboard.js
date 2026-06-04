/**
 * Dashboard Page — File upload with drag-and-drop, preview, and analysis trigger
 */
import { isLoggedIn, getUserInitials, getUserName, logout } from '../utils/auth.js';
import { parseFile, validateColumns, formatFileSize, generateSampleData } from '../utils/fileParser.js';
import { analyzeTrading } from '../utils/analysisEngine.js';

let parsedData = null;
let columnMap = null;

export function render() {
  if (!isLoggedIn()) {
    window.location.hash = '#/login';
    return '<div></div>';
  }

  const initials = getUserInitials();
  const name = getUserName();

  return `
    <div class="dashboard-page">
      <!-- Top Bar -->
      <header class="dashboard-topbar">
        <div class="topbar-left">
          <div class="topbar-logo">ψ</div>
          <span class="topbar-brand">TradePsych AI</span>
        </div>
        <div class="topbar-right">
          <div class="topbar-user">
            <div class="topbar-avatar">${initials}</div>
            <span>${name}</span>
          </div>
          <button class="topbar-logout" id="logoutBtn">Log Out</button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="dashboard-content">
        <div class="dashboard-welcome">
          <h1><span class="wave">👋</span> Welcome, ${name.split(' ')[0]}!</h1>
          <p>Upload your trading history to get a comprehensive behavioral analysis report.</p>
        </div>

        <!-- Upload Zone -->
        <div class="upload-zone-wrapper">
          <div class="upload-zone glass-card" id="uploadZone">
            <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" />
            <div class="upload-icon">📂</div>
            <h2>Drag & drop your file here, or <span class="highlight">browse</span></h2>
            <p class="upload-hint">Upload your trading history to begin analysis</p>
            <div class="upload-formats">
              <span class="format-tag">.CSV</span>
              <span class="format-tag">.XLSX</span>
              <span class="format-tag">.XLS</span>
            </div>
          </div>
        </div>

        <!-- File Preview (hidden initially) -->
        <div id="filePreview" style="display: none;"></div>

        <!-- Actions -->
        <div class="dashboard-actions" id="dashboardActions">
          <button class="btn-analyze" id="analyzeBtn" disabled>
            🧠 Analyze My Trading
          </button>
          <button class="btn-ghost btn-sample" id="sampleBtn">
            📋 Use Sample Data
          </button>
        </div>
      </main>

      <!-- Loading Overlay -->
      <div class="analysis-loading" id="analysisLoading">
        <div class="loading-brain">🧠</div>
        <div class="loading-text">Analyzing Your Trading Psychology...</div>
        <div class="loading-subtext" id="loadingStatus">Parsing trade data...</div>
        <div class="loading-progress">
          <div class="loading-progress-bar" id="loadingBar"></div>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  parsedData = null;
  columnMap = null;

  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- Logout ---
  logoutBtn?.addEventListener('click', () => {
    logout();
    window.location.hash = '#/login';
  });

  // --- Drag & Drop ---
  uploadZone?.addEventListener('click', () => fileInput.click());

  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // --- Sample Data ---
  sampleBtn?.addEventListener('click', () => {
    const data = generateSampleData();
    parsedData = data;
    columnMap = {};
    data.headers.forEach(h => columnMap[h] = h);
    showPreview(data, 'sample_trading_data.csv', 0);
    analyzeBtn.disabled = false;
  });

  // --- Analyze ---
  analyzeBtn?.addEventListener('click', () => {
    if (!parsedData) return;
    runAnalysis();
  });
}

export function unmount() {
  parsedData = null;
  columnMap = null;
}

async function handleFile(file) {
  const analyzeBtn = document.getElementById('analyzeBtn');

  // Validate file type
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Please upload a CSV or Excel file.', 'error');
    return;
  }

  try {
    const data = await parseFile(file);
    const validation = validateColumns(data.headers);

    parsedData = data;
    columnMap = validation.mapped;

    showPreview(data, file.name, file.size);

    if (!validation.valid) {
      showToast(`Some expected columns are missing: ${validation.missing.join(', ')}. Results may be limited.`, 'error');
    }

    analyzeBtn.disabled = false;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showPreview(data, fileName, fileSize) {
  const container = document.getElementById('filePreview');
  if (!container) return;

  const previewRows = data.rawRows.slice(0, 5);
  const totalRows = data.rawRows.length;

  container.innerHTML = `
    <div class="file-info-bar">
      <div class="file-info-left">
        <div class="file-icon">📄</div>
        <div>
          <div class="file-name">${fileName}</div>
          <div class="file-meta">${fileSize > 0 ? formatFileSize(fileSize) + ' • ' : ''}${totalRows} trades • ${data.headers.length} columns</div>
        </div>
      </div>
      <button class="file-remove" id="removeFileBtn">✕</button>
    </div>
    <div class="preview-table-wrapper">
      <table class="preview-table">
        <thead>
          <tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${previewRows.map(row => `
            <tr>${row.map(cell => `<td>${cell ?? '-'}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
      ${totalRows > 5 ? `<div class="preview-rows-hint">Showing 5 of ${totalRows} rows</div>` : ''}
    </div>
  `;

  container.style.display = 'block';

  // Remove file handler
  document.getElementById('removeFileBtn')?.addEventListener('click', () => {
    parsedData = null;
    columnMap = null;
    container.style.display = 'none';
    container.innerHTML = '';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('fileInput').value = '';
  });
}

async function runAnalysis() {
  const overlay = document.getElementById('analysisLoading');
  const bar = document.getElementById('loadingBar');
  const status = document.getElementById('loadingStatus');

  overlay.classList.add('active');

  const steps = [
    { text: 'Parsing trade data...', progress: 15 },
    { text: 'Detecting behavioral patterns...', progress: 35 },
    { text: 'Computing risk scores...', progress: 55 },
    { text: 'Analyzing loss causes...', progress: 70 },
    { text: 'Building trader profile...', progress: 85 },
    { text: 'Generating report...', progress: 100 }
  ];

  for (const step of steps) {
    status.textContent = step.text;
    bar.style.width = step.progress + '%';
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
  }

  // Run actual analysis
  const report = analyzeTrading(parsedData.rows, columnMap || {});

  // Store report for the report page
  sessionStorage.setItem('tradepsych_report', JSON.stringify(report));

  await new Promise(r => setTimeout(r, 400));
  overlay.classList.remove('active');

  // Navigate to report
  window.location.hash = '#/report';
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
