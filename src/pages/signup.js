/**
 * Signup Page — Registration screen with glassmorphic styling
 */
import { register } from '../utils/auth.js';

export function render() {
  return `
    <div class="login-page">
      <div class="login-container">
        <button class="login-back" id="signupBackBtn">
          ← Back to Home
        </button>

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
                  minlength="6"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" id="toggleSignupPassword">👁</button>
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

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
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
      submitBtn.style.animation = '';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }
}

export function unmount() {}
