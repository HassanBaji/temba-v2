export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimiter = {
  /** Counts one hit for `key`; false when any rule is over its limit. */
  hit: (key: string, now?: number) => boolean;
  reset: () => void;
};

type Window = { startedAt: number; count: number };

/**
 * Fixed windows kept in this process's memory. Each API instance counts on
 * its own, so the real ceiling is the limit times the number of instances.
 */
export function createRateLimiter(
  rules: readonly RateLimitRule[],
): RateLimiter {
  const buckets = rules.map((rule) => ({
    rule,
    windows: new Map<string, Window>(),
    sweptAt: 0,
  }));

  function sweep(bucket: (typeof buckets)[number], now: number) {
    if (now - bucket.sweptAt < bucket.rule.windowMs) {
      return;
    }
    bucket.sweptAt = now;
    for (const [key, window] of bucket.windows) {
      if (now - window.startedAt >= bucket.rule.windowMs) {
        bucket.windows.delete(key);
      }
    }
  }

  return {
    hit(key, now = Date.now()) {
      let allowed = true;
      for (const bucket of buckets) {
        sweep(bucket, now);
        const current = bucket.windows.get(key);
        if (!current || now - current.startedAt >= bucket.rule.windowMs) {
          bucket.windows.set(key, { startedAt: now, count: 1 });
          allowed &&= bucket.rule.limit >= 1;
          continue;
        }
        current.count += 1;
        allowed &&= current.count <= bucket.rule.limit;
      }
      return allowed;
    },
    reset() {
      for (const bucket of buckets) {
        bucket.windows.clear();
        bucket.sweptAt = 0;
      }
    },
  };
}
