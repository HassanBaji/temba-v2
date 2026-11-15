import { verifyWebhook } from "@clerk/backend/webhooks";
import { anonymiseUserFromClerk } from "@repo/api/auth/delete-clerk-user";
import {
  ClerkUserSyncRejected,
  upsertUserFromClerk,
  type ClerkUserSyncDb,
} from "@repo/api/auth/sync-clerk-user";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

export const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

export function webhookBodyLimit() {
  return bodyLimit({
    maxSize: WEBHOOK_BODY_LIMIT_BYTES,
    onError: (c) => c.text("Payload too large", 413),
  });
}

export function webhooksRoute(options: {
  signingSecret: string;
  db: ClerkUserSyncDb;
}) {
  const database = options.db;
  return new Hono().post("/api/webhooks", webhookBodyLimit(), async (c) => {
    let evt;
    try {
      evt = await verifyWebhook(c.req.raw, {
        signingSecret: options.signingSecret,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return c.text("Verification failed", 400);
    }

    try {
      if (evt.type === "user.created" || evt.type === "user.updated") {
        await upsertUserFromClerk(database, evt.data);
      } else if (evt.type === "user.deleted" && evt.data.id) {
        await anonymiseUserFromClerk(database, evt.data.id);
      }
    } catch (err) {
      // Svix retries anything but a 2xx, and these payloads never apply.
      if (err instanceof ClerkUserSyncRejected) {
        console.warn(`Ignored Clerk ${evt.type}:`, err.message);
        return c.text("Ignored", 200);
      }
      console.error(`Failed to apply Clerk ${evt.type}:`, err);
      return c.text("Failed to sync user", 500);
    }

    return c.text("OK", 200);
  });
}
