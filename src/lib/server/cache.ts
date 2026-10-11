/**
 * In-memory TTL + size-capped (LRU) cache. Pure and dependency-free (the clock is injectable) so it is
 * easy to unit test. State lives in the current process only: on serverless platforms every instance
 * has its own cache and it is lost on restart, so treat it as a best-effort optimisation.
 */
export class TtlLruCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  /** Returns the live value (and marks it most recently used) or undefined when missing/expired. */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Map keeps insertion order: re-insert to move the key to the "newest" end.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    if (ttlMs <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    if (this.entries.size > this.maxEntries) this.evict();
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  /** Drops expired entries first, then the least recently used ones until within the cap. */
  private evict(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(key);
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) break;
      this.entries.delete(key);
    }
  }
}
