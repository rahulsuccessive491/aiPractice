// Tiny fetch wrapper. Throws a structured error on non-2xx so callers can
// surface field-level validation messages back to the UI.

let currentToken = null;

export function setAuthToken(token) {
  currentToken = token;
}

const BASE = '/api';

async function request(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkErr) {
    const err = new Error('Network error — is the API running?');
    err.cause = networkErr;
    throw err;
  }

  // Handle blob response (for CSV export)
  if (options.responseType === 'blob') {
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(text || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    const blob = await res.blob();
    return { data: blob };
  }

  // Handle JSON response
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = (data && data.fields) || null;
    throw err;
  }
  return data;
}

export const api = {
  get:   (path, options)         => request('GET',   path, undefined, options),
  post:  (path, body, options)   => request('POST',  path, body, options),
  patch: (path, body, options)   => request('PATCH', path, body, options),
  del:   (path, options)         => request('DELETE', path, undefined, options),
};
