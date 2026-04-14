export const SESSION_COOKIE_NAME = 'smart_guard_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isPlaceholderEmail(value) {
  return /@smartguard\.local$/i.test(String(value || '').trim());
}

function isPlaceholderPhone(value) {
  return /^placeholder-/i.test(String(value || '').trim());
}

export function normalizeSession(session) {
  if (!session?.user) {
    return session || null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      email: isPlaceholderEmail(session.user.email)
        ? ''
        : String(session.user.email || '').trim().toLowerCase(),
      phone: isPlaceholderPhone(session.user.phone) ? '' : String(session.user.phone || '').trim(),
    },
  };
}

export function encodeSessionCookie(session) {
  const normalized = normalizeSession(session);
  return encodeURIComponent(JSON.stringify(normalized));
}

export function decodeSessionCookie(value) {
  if (!value) {
    return null;
  }

  try {
    return normalizeSession(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
