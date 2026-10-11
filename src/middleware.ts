import { defineMiddleware } from 'astro:middleware';
import { jsonError } from '@/lib/server/api';
import { rateLimited } from '@/lib/server/errors';
import { TokenBucketLimiter, type LimitResult } from '@/lib/server/rate-limit';

/**
 * Per-client-IP rate limiting for /api/*. State is in memory, so it is per server instance
 * (best effort on serverless) - see "Caching and rate limiting" in docs/API.md.
 */

const MINUTE = 60;
const DAY = 24 * 3600;

/** Every /api request except map tiles (a map view loads dozens of tiles). */
const general = new TokenBucketLimiter(120, 120 / MINUTE);
const tiles = new TokenBucketLimiter(600, 600 / MINUTE);
/** TomTom-backed route checks: short burst limit + daily cap per IP. */
const routeMinute = new TokenBucketLimiter(15, 15 / MINUTE);
const routeDay = new TokenBucketLimiter(150, 150 / DAY);

function clientIp(request: Request, clientAddress: () => string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  try {
    return clientAddress() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!pathname.startsWith('/api/')) return next();

  const ip = clientIp(context.request, () => context.clientAddress);
  const isTiles = pathname.startsWith('/api/tiles/');
  const checks: Array<() => LimitResult> = [() => (isTiles ? tiles : general).take(ip)];
  if (pathname === '/api/route') {
    checks.push(
      () => routeMinute.take(ip),
      () => routeDay.take(ip),
    );
  }

  for (const check of checks) {
    const result = check();
    if (!result.allowed) {
      console.warn(`[rate-limit] 429 ${pathname} ip=${ip}`);
      const isRoute = pathname === '/api/route';
      const when = result.retryAfterSeconds > 120 ? 'later today' : 'in a minute';
      const message = isRoute ? 'Too many route checks right now.' : 'Too many requests.';
      return jsonError(rateLimited(`${message} Try again ${when}.`, result.retryAfterSeconds));
    }
  }
  return next();
});
