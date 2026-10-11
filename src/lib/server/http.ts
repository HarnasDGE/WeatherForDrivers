import { UPSTREAM_TIMEOUT_MS } from './config';
import { HttpError } from './errors';

export interface FetchUpstreamOptions {
  /** Human-readable upstream name used in error messages, e.g. "TomTom". */
  service: string;
  timeoutMs?: number;
  /** Extra attempts on 429 / 5xx / network errors (exponential backoff). Default 0. */
  retries?: number;
  init?: RequestInit;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

/** Removes secrets (key/appid/client_id/...) from a URL before it lands in logs. */
export function redactUrl(url: string | URL): string {
  const u = new URL(url.toString());
  for (const param of ['key', 'appid', 'client_id', 'apikey', 'api_key']) {
    if (u.searchParams.has(param)) u.searchParams.set(param, '***');
  }
  return u.toString();
}

/**
 * fetch() with timeout, optional retries and normalized errors:
 * - timeout                -> HttpError 504 UPSTREAM_TIMEOUT
 * - network / non-2xx      -> HttpError 502 UPSTREAM_ERROR
 * Returns the raw Response (status 2xx) so callers can read JSON or binary.
 */
export async function fetchUpstream(url: string | URL, options: FetchUpstreamOptions): Promise<Response> {
  const { service, timeoutMs = UPSTREAM_TIMEOUT_MS, retries = 0, init } = options;
  let attempt = 0;

  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
      if (!timedOut && attempt < retries) {
        await sleep(backoff(attempt++));
        continue;
      }
      console.error(`[upstream] ${service} request failed: ${redactUrl(url)}`, cause);
      throw timedOut
        ? new HttpError(504, 'UPSTREAM_TIMEOUT', `${service} did not respond within ${timeoutMs} ms.`, { cause })
        : new HttpError(502, 'UPSTREAM_ERROR', `Could not reach ${service}.`, { cause });
    }

    if (response.ok) return response;

    if (isRetryableStatus(response.status) && attempt < retries) {
      await response.body?.cancel();
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
      attempt++;
      continue;
    }

    const body = await response.text().catch(() => '');
    console.error(`[upstream] ${service} responded ${response.status}: ${redactUrl(url)} ${body.slice(0, 300)}`);
    throw new HttpError(502, 'UPSTREAM_ERROR', describeStatus(service, response.status));
  }
}

/** fetchUpstream + JSON parsing. `T` is the expected (unvalidated) upstream shape. */
export async function fetchJson<T>(url: string | URL, options: FetchUpstreamOptions): Promise<T> {
  const response = await fetchUpstream(url, {
    ...options,
    init: { ...options.init, headers: { Accept: 'application/json', ...options.init?.headers } },
  });
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new HttpError(502, 'UPSTREAM_ERROR', `${options.service} returned an invalid JSON response.`, { cause });
  }
}

function backoff(attempt: number): number {
  return 500 * 2 ** attempt + Math.floor(Math.random() * 250);
}

function describeStatus(service: string, status: number): string {
  if (status === 401 || status === 403) return `${service} rejected the API key (HTTP ${status}). Check the server configuration.`;
  if (status === 429) return `${service} rate limit exceeded. Try again in a moment.`;
  if (status === 400 || status === 404) return `${service} could not process the request (HTTP ${status}).`;
  return `${service} returned an error (HTTP ${status}).`;
}

/**
 * Maps `items` with at most `limit` concurrent `fn` calls. Results keep input order;
 * the first rejection rejects the whole call (remaining queued items are not started).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;

  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index] as T, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}
