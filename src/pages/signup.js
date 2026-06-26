/**
 * Signup Page — Registration screen with glassmorphic styling
 */
import { register } from '../utils/auth.js';

export function render() {
  return `
    <div class="login-page">
      <div class="login-container">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 20px;">
          <button class="login-back" id="signupBackBtn" style="margin-bottom: 0;">
            ← Back to Home
          </button>
          <a href="#/simulation" class="btn-ghost" style="text-decoration: none; margin-bottom: 0; padding: 6px 12px; border-radius: 6px; font-size: 0.9em; display: inline-flex; align-items: center; color: var(--clr-primary-light); background: rgba(124, 92, 252, 0.1); border: 1px solid rgba(124, 92, 252, 0.2);">
            Live Simulation 📈
          </a>
        </div>

        <div class="login-card glass-card">
          <div class="login-header">
            <div class="login-lock">🚀</div>
            <h1>Create Account</h1>
            <p>Sign up to decode your trading psychology</p>
            <div class="secure-badge">
              <span class="dot"></span>
              Secure Registration
            </div>
          </div>

          <div class="login-error" id="signupError"></div>

          <form class="login-form" id="signupForm">
            <div class="form-group">
              <label for="signupName">Full Name</label>
              <div class="input-wrapper">
                <span class="input-icon">👤</span>
                <input
                  type="text"
                  id="signupName"
                  placeholder="Your Name"
                  required
                  autocomplete="name"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="signupEmail">Email Address</label>
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input
                  type="email"
                  id="signupEmail"
                  placeholder="your@email.com"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="signupPassword">Password</label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input
                  type="password"
                  id="signupPassword"
                  placeholder="••••••"
                  required
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" id="toggleSignupPassword">👁</button>
              </div>
              <div class="pwd-strength-meter" id="pwdStrengthMeter" style="margin-top: 8px;">
                <div class="pwd-strength-bar-bg" style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                  <div class="pwd-strength-bar" id="pwdStrengthBar" style="height: 100%; width: 0%; transition: width 0.3s, background-color 0.3s;"></div>
                </div>
                <div class="pwd-strength-text" id="pwdStrengthText" style="font-size: var(--fs-xs); margin-top: 4px; font-weight: 500;"></div>
                <ul class="pwd-requirements" style="font-size: var(--fs-xs); margin-top: 6px; padding-left: 0; color: rgba(255,255,255,0.4); list-style-type: none; line-height: 1.4;">
                  <li id="req-length">❌ Min 8 characters</li>
                  <li id="req-upper">❌ At least 1 uppercase letter</li>
                  <li id="req-lower">❌ At least 1 lowercase letter</li>
                  <li id="req-digit">❌ At least 1 number</li>
                  <li id="req-special">❌ At least 1 special character</li>
                </ul>
              </div>
            </div>

            <div class="form-group">
              <label for="signupConfirmPassword">Confirm Password</label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input
                  type="password"
                  id="signupConfirmPassword"
                  placeholder="••••••"
                  required
                  minlength="6"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" id="toggleConfirmPassword">👁</button>
              </div>
            </div>

            <button type="submit" class="btn-primary login-submit" id="signupSubmitBtn">
              <span class="btn-text">Sign Up</span>
              <span class="btn-spinner"></span>
            </button>
          </form>

          <div class="login-footer">
            <p>Already have an account? <a href="#/login" style="color: var(--clr-primary-light); font-weight: 500;">Sign In</a></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const form = document.getElementById('signupForm');
  const submitBtn = document.getElementById('signupSubmitBtn');
  const errorEl = document.getElementById('signupError');
  
  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  const passwordInput = document.getElementById('signupPassword');
  const confirmPasswordInput = document.getElementById('signupConfirmPassword');
  
  const togglePasswordBtn = document.getElementById('toggleSignupPassword');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
  const backBtn = document.getElementById('signupBackBtn');

  // Back to home
  backBtn?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Toggle password visibility
  togglePasswordBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.textContent = isPassword ? '🙈' : '👁';
  });

  toggleConfirmPasswordBtn?.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';
    toggleConfirmPasswordBtn.textContent = isPassword ? '🙈' : '👁';
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Client-side checks
    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      showError('Password does not meet all strong requirements below.');
      return;
    }

    // Show loading state
    submitBtn.classList.add('loading');
    errorEl.classList.remove('visible');

    try {
      await register(name, email, password);
      window.location.hash = '#/dashboard';
    } catch (err) {
      showError(err.message);
      submitBtn.classList.remove('loading');
      
      // Shake animation
      submitBtn.style.animation = 'none';
      submitBtn.offsetHeight; // Trigger reflow
      submitBtn.style.animation = 'shake 0.4s ease';
    }
  });

  // Real-time password strength check
  const pwdStrengthBar = document.getElementById('pwdStrengthBar');
  const pwdStrengthText = document.getElementById('pwdStrengthText');
  const reqLength = document.getElementById('req-length');
  const reqUpper = document.getElementById('req-upper');
  const reqLower = document.getElementById('req-lower');
  const reqDigit = document.getElementById('req-digit');
  const reqSpecial = document.getElementById('req-special');

  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    
    // Check criteria
    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasDigit = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);
    
    // Update checklist
    updateReq(reqLength, hasLength, 'Min 8 characters');
    updateReq(reqUpper, hasUpper, 'At least 1 uppercase letter');
    updateReq(reqLower, hasLower, 'At least 1 lowercase letter');
    updateReq(reqDigit, hasDigit, 'At least 1 number');
    updateReq(reqSpecial, hasSpecial, 'At least 1 special character');
    
    // Calculate score
    let score = 0;
    if (val.length > 0) {
      if (hasLength) score++;
      if (hasUpper) score++;
      if (hasLower) score++;
      if (hasDigit) score++;
      if (hasSpecial) score++;
    }
    
    // Update strength text and color
    let color = '#ef5350';
    let text = '';
    let width = '0%';
    
    if (val.length === 0) {
      text = '';
      width = '0%';
    } else if (score <= 2) {
      text = 'Weak 🛑';
      color = '#ef5350';
      width = '30%';
    } else if (score <= 4) {
      text = 'Medium ⚠️';
      color = '#ff9800';
      width = '60%';
    } else {
      text = 'Strong Passphrase ✅';
      color = '#4caf50';
      width = '100%';
    }
    
    if (pwdStrengthBar) {
      pwdStrengthBar.style.width = width;
      pwdStrengthBar.style.backgroundColor = color;
    }
    if (pwdStrengthText) {
      pwdStrengthText.textContent = text;
      pwdStrengthText.style.color = color;
    }
  });

  function updateReq(el, met, text) {
    if (!el) return;
    if (met) {
      el.innerHTML = `✅ ${text}`;
      el.style.color = '#4caf50';
    } else {
      el.innerHTML = `❌ ${text}`;
      el.style.color = 'rgba(255,255,255,0.4)';
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }
}

export function unmount() {}
