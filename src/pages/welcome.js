/**
 * Welcome Page — Landing page with hero, features, and stats
 */
import { initParticles } from '../components/particles.js';

let cleanupParticles = null;

export function render() {
  return `
    <div class="welcome-page">
      <canvas class="particles-canvas" id="welcomeParticles"></canvas>

      <!-- Navigation -->
      <nav class="welcome-nav">
        <div class="logo">
          <div class="logo-icon">ψ</div>
          <span>TradePsych AI</span>
        </div>
        <div class="nav-actions">
          <button class="btn-login" id="navLoginBtn">Log In</button>
          <button class="btn-get-started" id="navGetStartedBtn">Get Started</button>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="welcome-hero animate-fade-in">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="pulse-dot"></span>
            AI-Powered Trading Psychology Analysis
          </div>

          <h1 class="hero-title">
            Decode Your<br>
            <span class="gradient-text">Trading Psychology</span>
          </h1>

          <p class="hero-subtitle">
            Upload your trading history and uncover the behavioral patterns behind your wins and losses.
            Our AI identifies emotional biases, predicts recurring risks, and generates your unique trader profile.
          </p>

          <div class="hero-actions">
            <button class="btn-primary" id="heroGetStarted">
              🚀 Get Started
            </button>
          </div>
        </div>
        <div class="hero-image-container">
          <img src="/images/welcome_hero.png" alt="Neural Trading Psychology Brain" class="hero-psychology-img" />
        </div>
      </section>

      <!-- Stats -->
      <section class="stats-bar">
        <div class="stat-item">
          <div class="stat-number" data-count="20000" data-suffix="+">0</div>
          <div class="stat-label">Trades Analyzed</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" data-count="95" data-suffix="%">0</div>
          <div class="stat-label">Pattern Accuracy</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" data-count="200" data-suffix="+">0</div>
          <div class="stat-label">Traders Profiled</div>
        </div>
      </section>

      <!-- Features -->
      <section class="features-section">
        <h2 class="features-title">How It <span class="gradient-text">Works</span></h2>
        <div class="features-grid">
          <div class="feature-card glass-card">
            <div class="feature-icon">🧠</div>
            <h3>Behavioral Analysis</h3>
            <p>Our model scans your trade log for revenge trading, panic exits, overtrading, and other emotional patterns that sabotage performance.</p>
          </div>
          <div class="feature-card glass-card">
            <div class="feature-icon">📊</div>
            <h3>Loss Attribution</h3>
            <p>Understand <em>why</em> you lost money. We break down losses by behavioral cause — emotional exits, overleveraging, poor timing, and more.</p>
          </div>
          <div class="feature-card glass-card">
            <div class="feature-icon">🔮</div>
            <h3>Risk Prediction</h3>
            <p>See which behavioral mistakes you're most likely to repeat, and get actionable recommendations to break the cycle.</p>
          </div>
        </div>
      </section>

    <!-- Footer -->
    <footer class="welcome-footer">
      <p>© 2026 TradePsych AI — Built for traders who want to master their psychology.</p>
 
      <p class="team-members">
        <strong>Team:</strong>
        Inarat Hussain (inarat214@gmail.com) |
        Bhanushree RN (bhanushree2603@gmail.com) |
        Sajida Begum (sajidabegumlaskar5@gmail.com)
      </p>
    </footer>
`;

}

export function mount() {
  // Init particles
  const canvas = document.getElementById('welcomeParticles');
  if (canvas) {
    cleanupParticles = initParticles(canvas);
  }

  // Animate stat counters
  animateCounters();

  // Navigation
  document.getElementById('navLoginBtn')?.addEventListener('click', () => {
    window.location.hash = '#/login';
  });

  document.getElementById('navGetStartedBtn')?.addEventListener('click', () => {
    window.location.hash = '#/signup';
  });

  document.getElementById('heroGetStarted')?.addEventListener('click', () => {
    window.location.hash = '#/signup';
  });


}

export function unmount() {
  if (cleanupParticles) {
    cleanupParticles();
    cleanupParticles = null;
  }
}

// Animate number counters
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.floor(current).toLocaleString() + suffix;
        }, 16);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}
