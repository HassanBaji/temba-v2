import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { z } from "zod";

import { notifications, user, type Db } from "@repo/db";
import type { Locale } from "@repo/i18n/locale";

import { logJobFailed } from "#src/jobs/handler";
import { JOB, MAX_ATTEMPTS, notificationEmailJob } from "#src/jobs/specs";
import { emailSender } from "#src/notifications/email/index";
import { renderNotificationEmail } from "#src/notifications/email/render";
import { loadNotificationItems } from "#src/notifications/load-notification-items";

export const jobName = JOB.notificationEmail;
export const payloadSchema = z.object({ notificationId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.notificationEmail;

// English until the Stored Locale lands (spec `.scratch/email-notifications`, ticket 2).
const LOCALE: Locale = "en";

/**
 * Re-reads the Notification and decides whether to send. Every failed check is
 * a definitive answer, so the Job completes without an email and without an
 * error; only the provider's transport failures throw (ADR-0054).
 */
export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  helpers?: Pick<JobHelpers, "job">,
  now: Date = new Date(),
): Promise<void> {
  const [loaded] = await loadNotificationItems(db, {
    where: eq(notifications.id, payload.notificationId),
    limit: 1,
  });
  if (!loaded || loaded.emailedAt) {
    return;
  }
  const recipient = await db.query.user.findFirst({
    where: eq(user.id, loaded.recipientUserId),
    columns: { email: true, emailVerified: true, emailNotifications: true },
  });
  if (
    !recipient?.email ||
    !recipient.emailVerified ||
    !recipient.emailNotifications
  ) {
    return;
  }
  const email = renderNotificationEmail(
    loaded.item,
    LOCALE,
    process.env.WEB_ORIGIN ?? "",
  );
  if (!email) {
    return;
  }

  // The Job key doubles as the provider's idempotency key, so a retry after a
  // crash between send and stamp cannot produce a second email.
  const job = notificationEmailJob(loaded.item.id);
  const result = await emailSender().send({
    to: recipient.email,
    ...email,
    idempotencyKey: job.key,
  });
  if (result.kind === "off") {
    console.log(JSON.stringify({ event: "email_channel_off", key: job.key }));
    return;
  }
  if (result.kind === "rejected") {
    logJobFailed(
      { name: job.name, key: job.key, attempts: helpers?.job.attempts ?? 1 },
      new Error(result.reason),
      true,
    );
    return;
  }
  await db
    .update(notifications)
    .set({ emailedAt: now })
    .where(eq(notifications.id, loaded.item.id));
}
