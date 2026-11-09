import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import { createRateLimiter } from "#src/rate-limit/rate-limiter";
import { enforceUserRateLimit } from "#src/rate-limit/user-rate-limits";

describe("createRateLimiter", () => {
  it("allows the limit within a window, refuses the next hit, and opens again after the window", () => {
    const limiter = createRateLimiter([{ limit: 3, windowMs: 1_000 }]);
    expect([0, 10, 20].map((now) => limiter.hit("a", now))).toEqual([
      true,
      true,
      true,
    ]);
    expect(limiter.hit("a", 30)).toBe(false);
    expect(limiter.hit("a", 999)).toBe(false);
    expect(limiter.hit("a", 1_000)).toBe(true);
  });

  it("counts each key on its own", () => {
    const limiter = createRateLimiter([{ limit: 1, windowMs: 1_000 }]);
    expect(limiter.hit("a", 0)).toBe(true);
    expect(limiter.hit("b", 0)).toBe(true);
    expect(limiter.hit("a", 1)).toBe(false);
    expect(limiter.hit("b", 1)).toBe(false);
  });

  it("refuses while any rule is over, even after the shorter window resets", () => {
    const limiter = createRateLimiter([
      { limit: 2, windowMs: 100 },
      { limit: 3, windowMs: 10_000 },
    ]);
    expect(limiter.hit("a", 0)).toBe(true);
    expect(limiter.hit("a", 1)).toBe(true);
    expect(limiter.hit("a", 2)).toBe(false);
    expect(limiter.hit("a", 200)).toBe(false);
    expect(limiter.hit("a", 10_000)).toBe(true);
  });

  it("drops expired windows and forgets every key on reset", () => {
    const limiter = createRateLimiter([{ limit: 1, windowMs: 1_000 }]);
    limiter.hit("a", 0);
    expect(limiter.hit("a", 1)).toBe(false);
    expect(limiter.hit("b", 5_000)).toBe(true);
    expect(limiter.hit("a", 5_001)).toBe(true);
    limiter.reset();
    expect(limiter.hit("a", 5_002)).toBe(true);
  });
});

describe("enforceUserRateLimit", () => {
  it("throws TOO_MANY_REQUESTS in the caller's Locale once the User is over", () => {
    const limiter = createRateLimiter([{ limit: 1, windowMs: 60_000 }]);
    enforceUserRateLimit(limiter, "user_1", "en");

    let refusal: unknown = null;
    try {
      enforceUserRateLimit(limiter, "user_1", "ar");
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(TRPCError);
    expect((refusal as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    expect((refusal as TRPCError).message).toBe(
      messagesFor("ar").invite.rateLimited,
    );
    expect(() => enforceUserRateLimit(limiter, "user_2", "en")).not.toThrow();
  });
});
