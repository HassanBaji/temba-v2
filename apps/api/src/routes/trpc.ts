import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@repo/api/root";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import { contextFor } from "../context";
import { clientIp, createRateLimiter, type RateLimiter } from "../rate-limit";

export const TRPC_BODY_LIMIT_BYTES = 4 * 1024 * 1024;
export const TRPC_MAX_BATCH_SIZE = 20;

const MINUTE = 60_000;

export const TRPC_RATE_LIMITS = {
  signedIn: { limit: 600, windowMs: MINUTE },
  signedOut: { limit: 120, windowMs: MINUTE },
  publicLookup: { limit: 30, windowMs: MINUTE },
};

/** Public doors that resolve a code or token, the ones worth enumerating. */
const PUBLIC_LOOKUPS = new Set([
  "games.inviteLinkByShortCode",
  "games.previewInviteLink",
  "groups.inviteLinkByShortCode",
  "groups.previewInviteLink",
  "teams.previewInviteLink",
]);

const ENDPOINT = "/api/trpc";

function procedurePaths(c: Context) {
  const raw = c.req.path.slice(ENDPOINT.length + 1);
  return decodeURIComponent(raw).split(",").filter(Boolean);
}

/**
 * The session's subject, read without verifying the token: it only picks the
 * bucket. A forged token gets its own bucket and then fails authentication.
 */
function sessionSubject(c: Context): string | null {
  const bearer = /^Bearer\s+(\S+)$/i.exec(c.req.header("authorization") ?? "");
  const token = bearer?.[1] ?? getCookie(c, "__session");
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: unknown };
    return typeof claims.sub === "string" && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

function tooManyRequests(c: Context, retryAfterSeconds: number) {
  c.header("Retry-After", String(retryAfterSeconds));
  return c.text("Too many requests", 429);
}

function trpcLimits(options: { limiter: RateLimiter; trustProxyHops: number }) {
  return createMiddleware(async (c, next) => {
    const paths = procedurePaths(c);
    if (paths.length > TRPC_MAX_BATCH_SIZE) {
      return c.text("Too many calls in one batch", 400);
    }
    const calls = Math.max(1, paths.length);
    const ip = clientIp(c, options.trustProxyHops);

    const lookups = paths.filter((path) => PUBLIC_LOOKUPS.has(path)).length;
    if (lookups > 0) {
      const lookup = options.limiter.hit(
        `lookup:${ip}`,
        TRPC_RATE_LIMITS.publicLookup,
        lookups,
      );
      if (!lookup.allowed) return tooManyRequests(c, lookup.retryAfterSeconds);
    }

    const subject = sessionSubject(c);
    const overall = subject
      ? options.limiter.hit(`user:${subject}`, TRPC_RATE_LIMITS.signedIn, calls)
      : options.limiter.hit(`ip:${ip}`, TRPC_RATE_LIMITS.signedOut, calls);
    if (!overall.allowed) return tooManyRequests(c, overall.retryAfterSeconds);

    await next();
  });
}

export function trpcRoute(
  options: Parameters<typeof contextFor>[0] & {
    limiter?: RateLimiter;
    trustProxyHops?: number;
  },
) {
  const createContext = contextFor(options);
  return new Hono().use(
    `${ENDPOINT}/*`,
    bodyLimit({
      maxSize: TRPC_BODY_LIMIT_BYTES,
      onError: (c) => c.text("Payload too large", 413),
    }),
    trpcLimits({
      limiter: options.limiter ?? createRateLimiter(),
      trustProxyHops: options.trustProxyHops ?? 1,
    }),
    trpcServer({
      endpoint: ENDPOINT,
      router: appRouter,
      createContext: (_opts, c) => createContext(c.req.raw),
      onError({ error, path, ctx }) {
        const entry = {
          path: path ?? null,
          code: error.code,
          userId:
            (ctx as Awaited<ReturnType<typeof createContext>> | undefined)
              ?.userId ?? null,
        };
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error("[tRPC] error", entry, error.cause ?? error);
        } else {
          console.warn("[tRPC] error", entry, error.message);
        }
      },
    }),
  );
}
