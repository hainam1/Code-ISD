export async function login({ identifier, password, loginType = 'user' }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, loginType }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Dang nhap that bai.');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('smart_guard_session', JSON.stringify(payload));
  }

  return payload;
}

export async function register({ fullName, identifier, registerType, password }) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, identifier, registerType, password }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Dang ky that bai.');
  }

  return payload;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smart_guard_session');
  }
}

export function getSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem('smart_guard_session');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
