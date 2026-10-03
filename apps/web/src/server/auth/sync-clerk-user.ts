import { and, eq, ne } from "drizzle-orm";
import type { UserWebhookEvent } from "@clerk/nextjs/webhooks";

import { user } from "@repo/db";

import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type AppTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type ClerkUserSyncDb = typeof db | AppTx | TestDatabase;

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

export const CLERK_USER_IDENTIFIER_REQUIRED =
  "Clerk user must have an email address or a phone number";

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

function displayName(
  clerkUser: ClerkUserPayload,
  email: string | null,
  phoneNumber: string | null,
) {
  const fromNames = [clerkUser.first_name, clerkUser.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    (fromNames.length > 0 ? fromNames : null) ??
    clerkUser.username ??
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
 */
export async function upsertUserFromClerk(
  database: ClerkUserSyncDb,
  clerkUser: ClerkUserPayload,
) {
  const primaryEmail = clerkPrimaryEmail(clerkUser);
  const { phoneNumber, phoneNumberVerified } = clerkPrimaryPhone(clerkUser);
  const email = primaryEmail ? primaryEmail.email_address.toLowerCase() : null;

  if (!email && !phoneNumber) {
    throw new Error(CLERK_USER_IDENTIFIER_REQUIRED);
  }

  const clerkId = clerkUser.id;
  const name = displayName(clerkUser, email, phoneNumber);
  const username = clerkUsername(clerkUser.username);
  const emailVerified = primaryEmail
    ? primaryEmail.verification?.status === "verified"
    : false;
  const image = clerkStoredImage(clerkUser);

  const byClerkId = await database.query.user.findFirst({
    where: eq(user.clerkId, clerkId),
  });
  const byEmail =
    !byClerkId && email
      ? await database.query.user.findFirst({
          where: eq(user.email, email),
        })
      : null;
  const byPhone =
    !byClerkId && !byEmail && phoneNumber
      ? await database.query.user.findFirst({
          where: eq(user.phoneNumber, phoneNumber),
        })
      : null;
  const existing = byClerkId ?? byEmail ?? byPhone ?? null;

  if (existing) {
    if (existing.clerkId && existing.clerkId !== clerkId) {
      throw new Error(
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
    const nextPhoneNumber =
      phoneNumber === null
        ? null
        : ((await availablePhoneNumber(database, phoneNumber, existing.id)) ??
          existing.phoneNumber);
    const nextPhoneVerified =
      nextPhoneNumber === phoneNumber
        ? phoneNumberVerified
        : existing.phoneNumberVerified;

    const [updated] = await writeDb(database)
      .update(user)
      .set({
        clerkId,
        name,
        email,
        emailVerified,
        username: nextUsername,
        phoneNumber: nextPhoneNumber,
        phoneNumberVerified: nextPhoneVerified,
        image,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existing.id))
      .returning();

    return updated ?? existing;
  }

  const insertUsername = await availableUsername(database, username);
  const insertPhoneNumber = await availablePhoneNumber(database, phoneNumber);

  const [created] = await writeDb(database)
    .insert(user)
    .values({
      clerkId,
      name,
      email,
      emailVerified,
      username: insertUsername,
      phoneNumber: insertPhoneNumber,
      phoneNumberVerified:
        insertPhoneNumber === phoneNumber ? phoneNumberVerified : false,
      image,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}
