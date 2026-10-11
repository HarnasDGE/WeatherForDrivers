/**
 * Pure rate-limiting primitives (clock passed in, no I/O) used by src/middleware.ts and the TomTom
 * budget guard. All state is per process - see "Caching and rate limiting" in docs/API.md.
 */

export interface LimitResult {
  allowed: boolean;
  /** Whole seconds until a request would be allowed again (0 when allowed). */
  retryAfterSeconds: number;
}

/** Token bucket per key: `capacity` tokens, refilled continuously at `refillPerSecond`. */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Takes one token for `key` at time `now` (ms). */
  take(key: string, now: number = Date.now()): LimitResult {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    const elapsedSeconds = Math.max(0, now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);
    bucket.updatedAt = now;

    let result: LimitResult = { allowed: true, retryAfterSeconds: 0 };
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
    } else {
      result = { allowed: false, retryAfterSeconds: Math.ceil((1 - bucket.tokens) / this.refillPerSecond) };
    }

    // Re-insert to keep recently active keys at the end, then cap the map (oldest keys go first).
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    if (this.buckets.size > this.maxKeys) this.prune(now);
    return result;
  }

  private prune(now: number): void {
    // A bucket idle long enough to be full again carries no information.
    const fullAfterMs = (this.capacity / this.refillPerSecond) * 1000;
    for (const [key, bucket] of this.buckets) if (now - bucket.updatedAt >= fullAfterMs) this.buckets.delete(key);
    for (const key of this.buckets.keys()) {
      if (this.buckets.size <= this.maxKeys) break;
      this.buckets.delete(key);
    }
  }
}

/** Global counter that resets at 00:00 UTC. */
export class DailyBudget {
  private day = '';
  private used = 0;

  constructor(private readonly limit: number) {}

  /** Consumes one unit; when the budget is exhausted nothing is consumed. */
  take(now: number = Date.now()): LimitResult {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      const nextMidnight = Date.UTC(
        new Date(now).getUTCFullYear(),
        new Date(now).getUTCMonth(),
        new Date(now).getUTCDate() + 1,
      );
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((nextMidnight - now) / 1000)) };
    }
    this.used++;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
