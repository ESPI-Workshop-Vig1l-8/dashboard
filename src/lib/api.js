// Client for the Sentinel-X backend, reached on the same origin
// (nginx proxies /api and /ws in production, Vite in development).

const TOKEN_KEY = 'sentinel.token';

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode): the token only lives in memory
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, token = getToken() } = {}) {
  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Backend injoignable');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText);
  return data;
}

export async function fetchHealth() {
  try {
    const res = await fetch('/api/v1/health');
    return await res.json();
  } catch {
    return null;
  }
}

// Opens the WebSocket and reconnects with backoff until stop() is called.
export function connectSocket(token, { onMessage, onStatus }) {
  let ws;
  let timer;
  let stopped = false;
  let delay = 1000;

  const open = () => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    onStatus('connecting');
    ws = new WebSocket(`${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    ws.onopen = () => {
      delay = 1000;
      onStatus('open');
    };
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      if (stopped) return;
      onStatus('closed');
      timer = setTimeout(open, delay);
      delay = Math.min(delay * 2, 15000);
    };
  };

  open();
  return () => {
    stopped = true;
    clearTimeout(timer);
    ws?.close();
  };
}
