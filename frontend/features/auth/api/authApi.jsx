import {
  decodeSessionCookie,
  encodeSessionCookie,
  normalizeSession,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth/session';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

function buildCookieString(value, options = {}) {
  const parts = [`${SESSION_COOKIE_NAME}=${value}`];

  if (options.maxAge != null) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function readCookie(name) {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}

function writeSessionCookie(session) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = buildCookieString(
    encodeSessionCookie(session),
    getSessionCookieOptions(),
  );
}

function clearSessionCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = buildCookieString('', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
}

async function requestAuth(path, options = {}) {
  return requestJson(path, options);
}

export async function login({ identifier, password, loginType = 'user' }) {
  const payload = normalizeSession(await requestAuth('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, loginType }),
  }));

  if (typeof window !== 'undefined') {
    writeSessionCookie(payload);
    window.dispatchEvent(new Event('smart-guard-session-changed'));
  }

  return payload;
}

export async function register({ fullName, identifier, registerType, password }) {
  return requestAuth('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, identifier, registerType, password }),
  });
}

export function logout() {
  clearSessionCookie();

  if (typeof window !== 'undefined') {
    fetch('/api/auth/logout', {
      method: 'POST',
      keepalive: true,
    }).catch(() => {});
    window.dispatchEvent(new Event('smart-guard-session-changed'));
  }
}

export function setSession(nextSession) {
  if (typeof window === 'undefined') {
    return;
  }

  writeSessionCookie(nextSession);
  window.dispatchEvent(new Event('smart-guard-session-changed'));
}

export function getSession() {
  if (typeof document === 'undefined') {
    return null;
  }

  return decodeSessionCookie(readCookie(SESSION_COOKIE_NAME));
}
