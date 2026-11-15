import type { DbClient, DbTx } from "@repo/db";
import { and, countDistinct, eq, ne } from "drizzle-orm";
import type { UserWebhookEvent } from "@clerk/backend/webhooks";

import { gamePlayers, user } from "@repo/db";
import { userDisplayName } from "@repo/domain/user-display-name";

import { isOperatorPublicMetadata } from "#src/auth/require-operator";
import { type db } from "#src/db";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { mergeIntoAccount } from "#src/unclaimed-players/merge-into-account";
import { notifyHistoryLinked } from "#src/unclaimed-players/notify-history-linked";

export type ClerkUserSyncDb = DbClient | DbTx;

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

export const CLERK_USER_IDENTIFIER_REQUIRED =
  "Clerk user must have an email address or a phone number";

export const CLERK_PHONE_HELD_UNVERIFIED =
  "Phone number belongs to another User and is not verified";

export const CLERK_EMAIL_HELD_UNVERIFIED =
  "Email belongs to another User and is not verified";

/**
 * A Clerk payload that can never be applied, however often it is delivered.
 * The webhook acknowledges it so Svix stops retrying.
 */
export class ClerkUserSyncRejected extends Error {
  override name = "ClerkUserSyncRejected";
}

function clerkUsername(username: string | null) {
  if (!username || username.length === 0) {
    return null;
  }
  return username;
}

function clerkPrimaryEmail(clerkUser: ClerkUserPayload) {
  const primary =
    clerkUser.email_addresses.find(
      (address) => address.id === clerkUser.primary_email_address_id,
    ) ?? clerkUser.email_addresses[0];
  return primary ?? null;
}

function clerkPrimaryPhone(clerkUser: ClerkUserPayload) {
  const primary =
    clerkUser.phone_numbers.find(
      (phone) => phone.id === clerkUser.primary_phone_number_id,
    ) ?? clerkUser.phone_numbers[0];
  if (!primary) {
    return { phoneNumber: null, phoneNumberVerified: false };
  }
  return {
    phoneNumber: primary.phone_number,
    phoneNumberVerified: primary.verification?.status === "verified",
  };
}

function writeDb(database: ClerkUserSyncDb): typeof db {
  return database as typeof db;
}

async function availableUsername(
  database: ClerkUserSyncDb,
  username: string | null,
  exceptUserId?: string,
) {
  if (!username) {
    return null;
  }
  const taken = await database.query.user.findFirst({
    where: exceptUserId
      ? and(eq(user.username, username), ne(user.id, exceptUserId))
      : eq(user.username, username),
    columns: { id: true },
  });
  return taken ? null : username;
}

async function availablePhoneNumber(
  database: ClerkUserSyncDb,
  phoneNumber: string | null,
  exceptUserId?: string,
) {
  if (!phoneNumber) {
    return null;
  }
  const taken = await database.query.user.findFirst({
    where: exceptUserId
      ? and(eq(user.phoneNumber, phoneNumber), ne(user.id, exceptUserId))
      : eq(user.phoneNumber, phoneNumber),
    columns: { id: true },
  });
  return taken ? null : phoneNumber;
}

async function availableEmail(
  database: ClerkUserSyncDb,
  email: string | null,
  exceptUserId?: string,
) {
  if (!email) {
    return null;
  }
  const taken = await database.query.user.findFirst({
    where: exceptUserId
      ? and(eq(user.email, email), ne(user.id, exceptUserId))
      : eq(user.email, email),
    columns: { id: true },
  });
  return taken ? null : email;
}

function clerkUpdatedAt(clerkUser: ClerkUserPayload): Date | null {
  return typeof clerkUser.updated_at === "number"
    ? new Date(clerkUser.updated_at)
    : null;
}

async function unclaimedPhoneHolder(
  database: ClerkUserSyncDb,
  phoneNumber: string | null,
  phoneNumberVerified: boolean,
  exceptUserId: string,
) {
  if (!phoneNumber || !phoneNumberVerified) {
    return null;
  }
  const holder = await database.query.user.findFirst({
    where: and(eq(user.phoneNumber, phoneNumber), ne(user.id, exceptUserId)),
  });
  return holder && isUnclaimed(holder) ? holder : null;
}

async function seatedGameCount(database: ClerkUserSyncDb, userId: string) {
  const [row] = await database
    .select({ count: countDistinct(gamePlayers.gameId) })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, userId));
  return row?.count ?? 0;
}

function clerkName(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function displayName(
  names: { firstName: string | null; lastName: string | null },
  clerkUser: ClerkUserPayload,
  email: string | null,
  phoneNumber: string | null,
) {
  return (
    userDisplayName(names) ??
    clerkUsername(clerkUser.username) ??
    email ??
    phoneNumber ??
    "Player"
  );
}

function clerkStoredImage(clerkUser: ClerkUserPayload): string | null {
  if (!clerkUser.has_image) {
    return null;
  }
  if (!clerkUser.image_url || clerkUser.image_url.length === 0) {
    return null;
  }
  return clerkUser.image_url;
}

/**
 * Insert or update the Temba User row for a Clerk user.created / user.updated
 * webhook. Lookup invite still matches username, email, and primary phone.
 * Email may be null when a phone number is present (and the reverse).
 *
 * A row without a clerkId is linked by phone only when Clerk verified that
 * phone: the SMS code is what proves the number belongs to the new account.
 * Linking an Unclaimed player claims its history (ADR-0042). An existing
 * account whose verified phone an Unclaimed player holds absorbs that player
 * instead of dropping the phone. The same holds for email: only a verified
 * one links a row, and one another row holds is dropped.
 *
 * `is_operator` follows `public_metadata.operator` on every delivery, so
 * granting or revoking Operator in Clerk reaches the directory Notifications
 * read (ADR-0081).
 *
 * A delivery older than the last one applied, or for a deleted account,
 * changes nothing and returns the row as it is.
 */
export async function upsertUserFromClerk(
  database: ClerkUserSyncDb,
  clerkUser: ClerkUserPayload,
) {
  const primaryEmail = clerkPrimaryEmail(clerkUser);
  const { phoneNumber, phoneNumberVerified } = clerkPrimaryPhone(clerkUser);
  const email = primaryEmail ? primaryEmail.email_address.toLowerCase() : null;

  if (!email && !phoneNumber) {
    throw new ClerkUserSyncRejected(CLERK_USER_IDENTIFIER_REQUIRED);
  }

  const clerkId = clerkUser.id;
  const firstName = clerkName(clerkUser.first_name);
  const lastName = clerkName(clerkUser.last_name);
  const name = displayName(
    { firstName, lastName },
    clerkUser,
    email,
    phoneNumber,
  );
  const username = clerkUsername(clerkUser.username);
  const emailVerified = primaryEmail
    ? primaryEmail.verification?.status === "verified"
    : false;
  const image = clerkStoredImage(clerkUser);
  const updatedAt = clerkUpdatedAt(clerkUser);
  const isOperator = isOperatorPublicMetadata(clerkUser.public_metadata);

  const deleted = await database.query.user.findFirst({
    where: eq(user.deletedClerkId, clerkId),
  });
  if (deleted) {
    return deleted;
  }

  const byClerkId = await database.query.user.findFirst({
    where: eq(user.clerkId, clerkId),
  });
  if (
    byClerkId?.clerkUpdatedAt &&
    updatedAt &&
    updatedAt < byClerkId.clerkUpdatedAt
  ) {
    return byClerkId;
  }
  const byEmail =
    !byClerkId && email && emailVerified
      ? await database.query.user.findFirst({
          where: eq(user.email, email),
        })
      : null;
  const byPhone =
    !byClerkId && !byEmail && phoneNumber && phoneNumberVerified
      ? await database.query.user.findFirst({
          where: eq(user.phoneNumber, phoneNumber),
        })
      : null;
  const existing = byClerkId ?? byEmail ?? byPhone ?? null;

  if (existing) {
    if (existing.clerkId && existing.clerkId !== clerkId) {
      throw new ClerkUserSyncRejected(
        byEmail
          ? "Email already belongs to a different Clerk user"
          : "Phone number already belongs to a different Clerk user",
      );
    }

    const nextUsername =
      username === null
        ? null
        : ((await availableUsername(database, username, existing.id)) ??
          existing.username);
    const absorbed = await unclaimedPhoneHolder(
      database,
      phoneNumber,
      phoneNumberVerified,
      existing.id,
    );
    const nextPhoneNumber =
      phoneNumber === null
        ? null
        : absorbed
          ? phoneNumber
          : ((await availablePhoneNumber(database, phoneNumber, existing.id)) ??
            existing.phoneNumber);
    const nextPhoneVerified =
      nextPhoneNumber === phoneNumber
        ? phoneNumberVerified
        : existing.phoneNumberVerified;
    const nextEmail =
      email === null
        ? null
        : ((await availableEmail(database, email, existing.id)) ??
          existing.email);
    const nextEmailVerified =
      nextEmail === email ? emailVerified : existing.emailVerified;

    const claiming = isUnclaimed(existing);

    return writeDb(database).transaction(async (tx) => {
      if (absorbed?.phoneNumber) {
        await mergeIntoAccount(tx, {
          survivorUserId: existing.id,
          mergedUserId: absorbed.id,
          phoneNumber: absorbed.phoneNumber,
        });
      }
      const now = new Date();
      const [updated] = await tx
        .update(user)
        .set({
          clerkId,
          name,
          firstName,
          lastName,
          email: nextEmail,
          emailVerified: nextEmailVerified,
          username: nextUsername,
          phoneNumber: nextPhoneNumber,
          phoneNumberVerified: nextPhoneVerified,
          image,
          isOperator,
          ...(claiming ? { claimedAt: now } : {}),
          ...(updatedAt ? { clerkUpdatedAt: updatedAt } : {}),
          updatedAt: now,
        })
        .where(eq(user.id, existing.id))
        .returning();

      if (claiming) {
        await notifyHistoryLinked(tx, {
          userId: existing.id,
          gameCount: await seatedGameCount(tx, existing.id),
          dedupeKey: "history_linked",
        });
      }

      return updated ?? existing;
    });
  }

  const insertUsername = await availableUsername(database, username);
  const insertEmail = await availableEmail(database, email);
  const insertPhoneNumber = await availablePhoneNumber(database, phoneNumber);
  if (!insertEmail && !insertPhoneNumber) {
    throw new ClerkUserSyncRejected(
      email && !insertEmail
        ? CLERK_EMAIL_HELD_UNVERIFIED
        : CLERK_PHONE_HELD_UNVERIFIED,
    );
  }

  const [created] = await writeDb(database)
    .insert(user)
    .values({
      clerkId,
      name,
      firstName,
      lastName,
      email: insertEmail,
      emailVerified: insertEmail === email ? emailVerified : false,
      username: insertUsername,
      phoneNumber: insertPhoneNumber,
      phoneNumberVerified:
        insertPhoneNumber === phoneNumber ? phoneNumberVerified : false,
      image,
      isOperator,
      clerkUpdatedAt: updatedAt,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}
