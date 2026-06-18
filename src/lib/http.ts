// Resilient JSON GET with timeout + retry (SPEC §3 rate-limit etiquette).
// Retries on 429 / 503 / network/timeout errors with exponential backoff, honoring a
// `Retry-After` header when present. Non-429 4xx are treated as permanent.

import { config } from "@/config";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry-After is seconds (integer) or an HTTP date; returns ms, or null if unparseable. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

/** Exponential backoff with jitter: ~0.5s, 1s, 2s, … capped at 8s. */
function backoffMs(attempt: number): number {
  const base = Math.min(8000, 500 * 2 ** attempt);
  return base + Math.random() * 250;
}

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}

export async function fetchJsonRetry<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { signal, timeoutMs = config.requestTimeoutMs, retries = config.maxRetries } = opts;

  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await fetch(url, { signal: ctrl.signal });

      // Retryable server responses.
      if (res.status === 429 || res.status === 503) {
        if (attempt >= retries) throw new HttpError(res.status, `GET ${url} → HTTP ${res.status}`);
        await delay(parseRetryAfter(res.headers.get("retry-after")) ?? backoffMs(attempt));
        continue;
      }
      if (!res.ok) throw new HttpError(res.status, `GET ${url} → HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      // The caller aborted — give up immediately.
      if (signal?.aborted) throw e;
      // Permanent HTTP errors (e.g. 404) don't get retried.
      if (e instanceof HttpError) throw e;
      // Network / timeout error — retry until out of attempts.
      if (attempt >= retries) throw e;
      await delay(backoffMs(attempt));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}
