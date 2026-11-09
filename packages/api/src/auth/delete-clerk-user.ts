import { eq } from "drizzle-orm";

import { user } from "@repo/db";
import { DEFAULT_LOCALE } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { ClerkUserSyncDb } from "#src/auth/sync-clerk-user";
import { type db } from "#src/db";

/**
 * Anonymise the Temba User row of a deleted Clerk account (user.deleted).
 * The row is kept, since other people's Games, Matches and Ratings reference
 * it: what identifies the person is cleared, and the Clerk id moves to
 * `deleted_clerk_id` so a late user.updated cannot bring the account back.
 * `added_at` is cleared too, or the row would read as an Unclaimed player.
 * Returns the row's id, or null when no row had that Clerk id.
 */
export async function anonymiseUserFromClerk(
  database: ClerkUserSyncDb,
  clerkId: string,
): Promise<string | null> {
  const now = new Date();
  const [row] = await (database as typeof db)
    .update(user)
    .set({
      clerkId: null,
      deletedClerkId: clerkId,
      deletedAt: now,
      name: messagesFor(DEFAULT_LOCALE).auth.deletedAccountName,
      firstName: null,
      lastName: null,
      email: null,
      emailVerified: false,
      username: null,
      displayUsername: null,
      phoneNumber: null,
      phoneNumberVerified: false,
      image: null,
      gender: null,
      birthDate: null,
      homeArea: null,
      nationality: null,
      playWindows: null,
      seatAlerts: false,
      emailNotifications: false,
      addedAt: null,
      addedByUserId: null,
      updatedAt: now,
    })
    .where(eq(user.clerkId, clerkId))
    .returning({ id: user.id });
  return row?.id ?? null;
}
