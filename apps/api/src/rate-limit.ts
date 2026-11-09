import type { Context } from "hono";

export type RateLimitRule = { limit: number; windowMs: number };

type Window = { count: number; resetAt: number };

const SWEEP_EVERY = 1_000;

/**
 * Fixed-window counters held in this process. Each API replica counts on its
 * own, which is enough to blunt bursts and enumeration.
 */
export function createRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, Window>();
  let hits = 0;

  function sweep(at: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= at) windows.delete(key);
    }
  }

  return {
    hit(key: string, rule: RateLimitRule, cost = 1) {
      const at = now();
      if (++hits % SWEEP_EVERY === 0) sweep(at);
      let window = windows.get(key);
      if (!window || window.resetAt <= at) {
        window = { count: 0, resetAt: at + rule.windowMs };
        windows.set(key, window);
      }
      window.count += cost;
      return {
        allowed: window.count <= rule.limit,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - at) / 1000)),
      };
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/**
 * The client address as the nearest trusted proxy saw it: `trustProxyHops`
 * entries from the end of X-Forwarded-For, since entries before the proxies'
 * own can be written by the client.
 */
export function clientIp(c: Context, trustProxyHops: number): string {
  const forwarded = (c.req.header("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (trustProxyHops > 0 && forwarded.length > 0) {
    return forwarded[Math.max(0, forwarded.length - trustProxyHops)]!;
  }
  const incoming = (
    c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined
  )?.incoming;
  return incoming?.socket?.remoteAddress ?? "unknown";
}
