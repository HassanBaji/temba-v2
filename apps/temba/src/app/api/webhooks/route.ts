import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { upsertUserFromClerk } from "~/server/auth/sync-clerk-user";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    try {
      await upsertUserFromClerk(evt.data);
    } catch (err) {
      console.error("Failed to sync Clerk user:", err);
      return new Response("Failed to sync user", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
