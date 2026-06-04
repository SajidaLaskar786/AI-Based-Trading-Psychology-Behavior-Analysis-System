/**
 * Auth module — Simple local-storage based authentication for demo
 */

const AUTH_KEY = 'tradepsych_auth';

// Demo credentials
const DEMO_CREDENTIALS = {
  email: 'trader@demo.com',
  password: 'demo123'
};

export function login(email, password) {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        const session = {
          email,
          name: 'Demo Trader',
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        resolve(session);
      } else {
        reject(new Error('Invalid email or password. Try: trader@demo.com / demo123'));
      }
    }, 1200);
  });
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
