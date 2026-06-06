/**
 * TradePsych AI — Main Entry Point & Router
 *
 * Simple hash-based SPA router that renders pages dynamically.
 */

// Import styles
import './styles/index.css';
import './styles/welcome.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/report.css';

// Import pages
import * as WelcomePage from './pages/welcome.js';
import * as LoginPage from './pages/login.js';
import * as SignupPage from './pages/signup.js';
import * as DashboardPage from './pages/dashboard.js';
import * as ReportPage from './pages/report.js';

// Route definitions
const routes = {
  '/': WelcomePage,
  '/login': LoginPage,
  '/signup': SignupPage,
  '/dashboard': DashboardPage,
  '/report': ReportPage,
};

let currentPage = null;
let currentRoute = null;

/**
 * Navigate to the current hash route
 */
function navigate() {
  const hash = window.location.hash.slice(1) || '/'; // Remove '#'
  const route = hash.startsWith('/') ? hash : '/' + hash;

  // Don't re-render the same page
  if (route === currentRoute) return;

  // Unmount current page
  if (currentPage && typeof currentPage.unmount === 'function') {
    currentPage.unmount();
  }

  // Find matching page
  const page = routes[route] || routes['/'];
  currentPage = page;
  currentRoute = route;

  // Render page
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.innerHTML = page.render();
  app.classList.add('page-enter');

  // Remove animation class after animation
  setTimeout(() => app.classList.remove('page-enter'), 500);

  // Mount page (attach event listeners)
  if (typeof page.mount === 'function') {
    page.mount();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial render
document.addEventListener('DOMContentLoaded', navigate);

// Also run on module load (for Vite HMR)
navigate();
