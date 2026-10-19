import { type TRPCContextHost } from "@repo/api/trpc";
import { Hono } from "hono";

import { type Authenticate } from "./context";
import { healthRoute } from "./routes/health";
import { mediaRoute } from "./routes/media";
import { paymentsRoute } from "./routes/payments";
import { trpcRoute } from "./routes/trpc";
import { webhooksRoute } from "./routes/webhooks";

export function createApp(options: {
  db: TRPCContextHost["db"];
  authenticate: Authenticate;
  webOrigin: string;
  webhookSigningSecret: string;
  paymentReturnUrl?: string;
}) {
  return new Hono()
    .route("/", healthRoute)
    .route("/", mediaRoute)
    .route("/", webhooksRoute({ signingSecret: options.webhookSigningSecret }))
    .route(
      "/",
      paymentsRoute({
        returnUrl: options.paymentReturnUrl ?? "temba://book/bookings",
      }),
    )
    .route("/", trpcRoute(options));
}
