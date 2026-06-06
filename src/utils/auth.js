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
      // 1. Check in registered users list in localStorage
      try {
        const users = JSON.parse(localStorage.getItem('tradepsych_users') || '[]');
        const registeredUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (registeredUser) {
          if (registeredUser.password === password) {
            const session = {
              email: registeredUser.email,
              name: registeredUser.name,
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(session));
            resolve(session);
            return;
          } else {
            reject(new Error('Invalid email or password.'));
            return;
          }
        }
      } catch (e) {
        console.error('Error reading registered users:', e);
      }

      // 2. Fall back to demo credentials
      if (email.toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase() && password === DEMO_CREDENTIALS.password) {
        const session = {
          email,
          name: 'Demo Trader',
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        resolve(session);
      } else {
        reject(new Error('Invalid email or password. Try registering a new account.'));
      }
    }, 1200);
  });
}

export function register(name, email, password) {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      try {
        if (!name || !email || !password) {
          reject(new Error('All fields are required.'));
          return;
        }

        const users = JSON.parse(localStorage.getItem('tradepsych_users') || '[]');
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          reject(new Error('Email is already registered.'));
          return;
        }

        const newUser = {
          name,
          email: email.toLowerCase(),
          password,
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('tradepsych_users', JSON.stringify(users));

        // Auto-login session creation
        const session = {
          email: newUser.email,
          name: newUser.name,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        resolve(session);
      } catch (err) {
        console.error('Registration error:', err);
        reject(new Error('Failed to create account. Please try again.'));
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
