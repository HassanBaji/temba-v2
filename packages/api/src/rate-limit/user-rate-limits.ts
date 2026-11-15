import { TRPCError } from "@trpc/server";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  createRateLimiter,
  type RateLimiter,
} from "#src/rate-limit/rate-limiter";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Per-User ceilings on the doors that turn a guess into a person. The lookup
 * searches run on each keystroke, so they allow the most.
 */
export const userRateLimits = {
  lookupSearch: createRateLimiter([
    { limit: 60, windowMs: MINUTE },
    { limit: 600, windowMs: HOUR },
  ]),
  phonePreview: createRateLimiter([
    { limit: 20, windowMs: MINUTE },
    { limit: 100, windowMs: HOUR },
  ]),
  invite: createRateLimiter([
    { limit: 30, windowMs: MINUTE },
    { limit: 300, windowMs: HOUR },
  ]),
  addByPhone: createRateLimiter([
    { limit: 20, windowMs: MINUTE },
    { limit: 100, windowMs: HOUR },
  ]),
} satisfies Record<string, RateLimiter>;

export function enforceUserRateLimit(
  limiter: RateLimiter,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (limiter.hit(userId)) {
    return;
  }
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: messagesFor(locale).invite.rateLimited,
  });
}
