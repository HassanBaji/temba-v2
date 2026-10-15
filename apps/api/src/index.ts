import { serve } from "@hono/node-server";
import { db } from "@repo/db";

import { createApp } from "./app";
import { clerkAuthenticator } from "./context";
import { env } from "./env";
import { startWorker } from "./worker";

const app = createApp({
  db,
  authenticate: clerkAuthenticator({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    jwtKey: env.CLERK_JWT_KEY,
    acceptSessionCookie: env.ACCEPT_SESSION_COOKIE,
    authorizedParties: [
      env.WEB_ORIGIN,
      ...(env.AUTHORIZED_PARTIES?.split(",").map((o) => o.trim()) ?? []),
    ].filter(Boolean),
  }),
  webOrigin: env.WEB_ORIGIN,
  webhookSigningSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
  paymentReturnUrl: env.PAYMENT_RETURN_URL,
});

const server = env.API_ENABLED
  ? serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
      console.log(`API listening on :${port}`);
    })
  : undefined;

const worker = env.WORKER_ENABLED
  ? await startWorker({
      databaseUrl: env.DATABASE_URL,
      concurrency: env.WORKER_CONCURRENCY,
    })
  : undefined;

process.once("SIGTERM", () => {
  server?.close();
  void worker?.stop().finally(() => process.exit(0));
  if (!worker) process.exit(0);
});
