import { serve } from "@hono/node-server";
import { db } from "@repo/db";

import { createApp } from "./app";
import { clerkAuthenticator } from "./context";
import { env } from "./env";

const app = createApp({
  db,
  authenticate: clerkAuthenticator({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  }),
  webOrigin: env.WEB_ORIGIN,
  webhookSigningSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  console.log(`API listening on :${port}`);
});
