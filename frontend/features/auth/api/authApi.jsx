import { buildBackendUrl } from '@/lib/api/backendClient';

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

async function requestAuthWithFallback(path, options = {}) {
  try {
    return await requestJson(buildBackendUrl(path), options);
  } catch (error) {
    const shouldFallback = !('status' in error) || error.status >= 500;

    if (!shouldFallback) {
      throw error;
    }
  }

  return requestJson(path, options);
}

export async function login({ identifier, password, loginType = 'user' }) {
  const payload = await requestAuthWithFallback('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, loginType }),
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('smart_guard_session', JSON.stringify(payload));
    window.dispatchEvent(new Event('smart-guard-session-changed'));
  }

  return payload;
}

export async function register({ fullName, identifier, registerType, password }) {
  return requestAuthWithFallback('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, identifier, registerType, password }),
  });
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smart_guard_session');
    window.dispatchEvent(new Event('smart-guard-session-changed'));
  }
}

export function setSession(nextSession) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('smart_guard_session', JSON.stringify(nextSession));
  window.dispatchEvent(new Event('smart-guard-session-changed'));
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
