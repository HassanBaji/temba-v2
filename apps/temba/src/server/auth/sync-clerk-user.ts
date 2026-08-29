import { and, eq, ne } from "drizzle-orm";
import type { UserWebhookEvent } from "@clerk/nextjs/webhooks";

import { user } from "@repo/db";

import { db } from "~/server/db";

type ClerkUserPayload = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

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
  const primary = clerkUser.phone_numbers.find(
    (phone) => phone.id === clerkUser.primary_phone_number_id,
  );
  if (!primary) {
    return { phoneNumber: null, phoneNumberVerified: false };
  }
  return {
    phoneNumber: primary.phone_number,
    phoneNumberVerified: primary.verification?.status === "verified",
  };
}

async function availableUsername(
  username: string | null,
  exceptUserId?: string,
) {
  if (!username) {
    return null;
  }
  const taken = await db.query.user.findFirst({
    where: exceptUserId
      ? and(eq(user.username, username), ne(user.id, exceptUserId))
      : eq(user.username, username),
    columns: { id: true },
  });
  return taken ? null : username;
}

async function availablePhoneNumber(
  phoneNumber: string | null,
  exceptUserId?: string,
) {
  if (!phoneNumber) {
    return null;
  }
  const taken = await db.query.user.findFirst({
    where: exceptUserId
      ? and(eq(user.phoneNumber, phoneNumber), ne(user.id, exceptUserId))
      : eq(user.phoneNumber, phoneNumber),
    columns: { id: true },
  });
  return taken ? null : phoneNumber;
}

function displayName(clerkUser: ClerkUserPayload, email: string) {
  const fromNames = [clerkUser.first_name, clerkUser.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    (fromNames.length > 0 ? fromNames : null) ?? clerkUser.username ?? email
  );
}

/**
 * Insert or update the Temba User row for a Clerk user.created / user.updated
 * webhook. Lookup invite still matches username, email, and primary phone.
 */
export async function upsertUserFromClerk(clerkUser: ClerkUserPayload) {
  const primaryEmail = clerkPrimaryEmail(clerkUser);
  if (!primaryEmail) {
    throw new Error("Clerk user must have an email address");
  }

  const clerkId = clerkUser.id;
  const email = primaryEmail.email_address.toLowerCase();
  const name = displayName(clerkUser, email);
  const username = clerkUsername(clerkUser.username);
  const { phoneNumber, phoneNumberVerified } = clerkPrimaryPhone(clerkUser);
  const emailVerified = primaryEmail.verification?.status === "verified";

  const existing =
    (await db.query.user.findFirst({
      where: eq(user.clerkId, clerkId),
    })) ??
    (await db.query.user.findFirst({
      where: eq(user.email, email),
    }));

  if (existing) {
    if (existing.clerkId && existing.clerkId !== clerkId) {
      throw new Error("Email already belongs to a different Clerk user");
    }

    const nextUsername =
      username === null
        ? null
        : ((await availableUsername(username, existing.id)) ??
          existing.username);
    const nextPhoneNumber =
      phoneNumber === null
        ? null
        : ((await availablePhoneNumber(phoneNumber, existing.id)) ??
          existing.phoneNumber);
    const nextPhoneVerified =
      nextPhoneNumber === phoneNumber
        ? phoneNumberVerified
        : existing.phoneNumberVerified;

    const [updated] = await db
      .update(user)
      .set({
        clerkId,
        name,
        email,
        emailVerified,
        username: nextUsername,
        phoneNumber: nextPhoneNumber,
        phoneNumberVerified: nextPhoneVerified,
        image: clerkUser.image_url,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existing.id))
      .returning();

    return updated ?? existing;
  }

  const insertUsername = await availableUsername(username);
  const insertPhoneNumber = await availablePhoneNumber(phoneNumber);

  const [created] = await db
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
      image: clerkUser.image_url,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}
