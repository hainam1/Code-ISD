const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000';

export function buildBackendUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_BASE_URL}${normalizedPath}`;
}

export async function requestBackend(path, options = {}) {
  const response = await fetch(buildBackendUrl(path), options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Backend request failed.');
  }

  return payload;
}
