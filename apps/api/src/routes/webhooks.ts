import { verifyWebhook } from "@clerk/backend/webhooks";
import { upsertUserFromClerk } from "@repo/api/auth/sync-clerk-user";
import { db } from "@repo/db";
import { Hono } from "hono";

export function webhooksRoute(options: { signingSecret: string }) {
  return new Hono().post("/api/webhooks", async (c) => {
    let evt;
    try {
      evt = await verifyWebhook(c.req.raw, {
        signingSecret: options.signingSecret,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return c.text("Verification failed", 400);
    }

    if (evt.type === "user.created" || evt.type === "user.updated") {
      try {
        await upsertUserFromClerk(db, evt.data);
      } catch (err) {
        console.error("Failed to sync Clerk user:", err);
        return c.text("Failed to sync user", 500);
      }
    }

    return c.text("OK", 200);
  });
}
