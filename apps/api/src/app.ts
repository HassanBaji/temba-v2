import { type TRPCContextHost } from "@repo/api/trpc";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

import { type Authenticate } from "./context";
import { type RateLimiter } from "./rate-limit";
import { healthRoute } from "./routes/health";
import { paymentsRoute } from "./routes/payments";
import { trpcRoute } from "./routes/trpc";
import { webhooksRoute } from "./routes/webhooks";

export function createApp(options: {
  db: TRPCContextHost["db"];
  authenticate: Authenticate;
  webOrigin: string;
  webhookSigningSecret: string;
  paymentReturnUrl?: string;
  trustProxyHops?: number;
  rateLimiter?: RateLimiter;
}) {
  return new Hono()
    .use(secureHeaders({ xFrameOptions: "DENY" }))
    .route("/", healthRoute({ db: options.db }))
    .route(
      "/",
      webhooksRoute({
        signingSecret: options.webhookSigningSecret,
        db: options.db,
      }),
    )
    .route(
      "/",
      paymentsRoute({
        returnUrl: options.paymentReturnUrl ?? "temba://book/bookings",
      }),
    )
    .route(
      "/",
      trpcRoute({
        db: options.db,
        authenticate: options.authenticate,
        webOrigin: options.webOrigin,
        limiter: options.rateLimiter,
        trustProxyHops: options.trustProxyHops,
      }),
    );
}
