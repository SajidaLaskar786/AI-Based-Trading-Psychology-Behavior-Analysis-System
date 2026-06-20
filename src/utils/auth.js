/**
 * Auth module — Simple local-storage based authentication for demo
 */

const AUTH_KEY = 'tradepsych_auth';

const API_BASE = 'http://localhost:8000/api/v1';

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let detail = 'Invalid email or password.';
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const user = await response.json();
  const session = {
    email: user.email,
    name: user.username,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export async function register(name, email, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email, password })
  });

  if (!response.ok) {
    let detail = 'Failed to create account.';
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const user = await response.json();
  const session = {
    email: user.email,
    name: user.username,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function getSession() {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getSession() !== null;
}

export function getUserInitials() {
  const session = getSession();
  if (!session || !session.name) return '?';
  return session.name.split(' ').map(w => w[0]).join('').toUpperCase();
}

export function getUserName() {
  const session = getSession();
  return session?.name || 'Trader';
}

export function getUserEmail() {
  const session = getSession();
  return session?.email || '';
}
