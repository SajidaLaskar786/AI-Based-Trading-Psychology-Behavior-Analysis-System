/**
 * Login Page — Secure login with glassmorphic card
 */
import { login } from '../utils/auth.js';

export function render() {
  return `
    <div class="login-page">
      <div class="login-container">
        <button class="login-back" id="loginBackBtn">
          ← Back to Home
        </button>

        <div class="login-card glass-card">
          <div class="login-header">
            <div class="login-lock">🔐</div>
            <h1>Welcome Back</h1>
            <p>Sign in to access your trading analysis</p>
            <div class="secure-badge">
              <span class="dot"></span>
              Secure Connection
            </div>
          </div>

          <div class="login-error" id="loginError"></div>

          <form class="login-form" id="loginForm">
            <div class="form-group">
              <label for="loginEmail">Email Address</label>
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input
                  type="email"
                  id="loginEmail"
                  placeholder="your@email.com"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="loginPassword">Password</label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input
                  type="password"
                  id="loginPassword"
                  placeholder="••••••"
                  required
                  minlength="4"
                  autocomplete="current-password"
                />
                <button type="button" class="toggle-password" id="togglePassword">👁</button>
              </div>
            </div>

            <div class="login-options">
              <label class="remember-me">
                <input type="checkbox" id="rememberMe" checked />
                Remember me
              </label>
              <span class="forgot-password">Forgot password?</span>
            </div>

            <button type="submit" class="btn-primary login-submit" id="loginSubmitBtn">
              <span class="btn-text">Sign In</span>
              <span class="btn-spinner"></span>
            </button>
          </form>

          <div class="login-divider">or</div>

          <button class="demo-login" id="demoLoginBtn">
            ⚡ Sign in with Demo Account
          </button>

          <div class="login-footer">
            <p>New to TradePsych AI? <a href="#/signup" style="color: var(--clr-primary-light); font-weight: 500;">Sign Up</a></p>
            <p style="margin-top: var(--space-xs); font-size: var(--fs-xs); opacity: 0.6;">Demo credentials: trader@demo.com / demo123</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const errorEl = document.getElementById('loginError');
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('loginPassword');
  const demoBtn = document.getElementById('demoLoginBtn');
  const backBtn = document.getElementById('loginBackBtn');

  // Back to home
  backBtn?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Toggle password visibility
  toggleBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁';
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = passwordInput.value;

    // Show loading
    submitBtn.classList.add('loading');
    errorEl.classList.remove('visible');

    try {
      await login(email, password);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
      submitBtn.classList.remove('loading');

      // Shake animation
      submitBtn.style.animation = 'none';
      submitBtn.offsetHeight; // Trigger reflow
      submitBtn.style.animation = '';
    }
  });

  // Demo login
  demoBtn?.addEventListener('click', async () => {
    const emailInput = document.getElementById('loginEmail');
    const pwInput = document.getElementById('loginPassword');

    // Auto-fill with animation
    emailInput.value = '';
    pwInput.value = '';

    const demoEmail = 'trader@demo.com';
    const demoPw = 'demo123';

    // Type email animation
    for (let i = 0; i < demoEmail.length; i++) {
      await delay(40);
      emailInput.value += demoEmail[i];
    }
    await delay(200);
    // Type password
    for (let i = 0; i < demoPw.length; i++) {
      await delay(60);
      pwInput.value += demoPw[i];
    }
    await delay(300);

    // Auto-submit
    form.dispatchEvent(new Event('submit'));
  });
}

export function unmount() {}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
