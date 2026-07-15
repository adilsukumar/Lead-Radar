// Zero-dependency HTTP helpers built on Node 18+ global fetch.
// Adds timeout, retry with backoff, a friendly UA, and JSON/text helpers.

const DEFAULT_UA =
  'lead-radar/1.0 (+https://github.com/; daily startup lead scanner)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with timeout + retry. Returns the Response, or throws after retries.
 */
export async function fetchWithRetry(url, opts = {}) {
  const {
    timeoutMs = 20000,
    retries = 2,
    backoffMs = 1500,
    headers = {},
    ...rest
  } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { 'user-agent': DEFAULT_UA, accept: '*/*', ...headers },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      // Retry on transient server / rate-limit responses.
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function getJSON(url, opts = {}) {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { accept: 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export async function getText(url, opts = {}) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}
