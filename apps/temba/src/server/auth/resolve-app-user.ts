import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "@repo/db";

function clerkUsername(clerkUser: { username: string | null }) {
  if (!clerkUser.username || clerkUser.username.length === 0) {
    return null;
  }
  return clerkUser.username;
}

function clerkPrimaryPhone(clerkUser: {
  primaryPhoneNumberId: string | null;
  phoneNumbers: {
    id: string;
    phoneNumber: string;
    verification: { status: string } | null;
  }[];
}) {
  const primary = clerkUser.phoneNumbers.find(
    (phone) => phone.id === clerkUser.primaryPhoneNumberId,
  );
  if (!primary) {
    return { phoneNumber: null, phoneNumberVerified: false };
  }
  return {
    phoneNumber: primary.phoneNumber,
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

/**
 * Resolve or create the Temba User row for the authenticated Clerk session.
 * Foreign keys use Temba User ids; Clerk remains the only identity provider.
 * Username and primary phone are persisted as Clerk gives them so Lookup
 * invite can match those keys.
 */
export async function resolveAppUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Authenticated user must have an email address",
    });
  }

  const email = primaryEmail.toLowerCase();
  const fromNames = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");
  const name =
    (fromNames.length > 0 ? fromNames : null) ?? clerkUser.username ?? email;
  const username = clerkUsername(clerkUser);
  const { phoneNumber, phoneNumberVerified } = clerkPrimaryPhone(clerkUser);

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (existing) {
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
        username: nextUsername,
        phoneNumber: nextPhoneNumber,
        phoneNumberVerified: nextPhoneVerified,
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
      name,
      email,
      emailVerified: true,
      username: insertUsername,
      phoneNumber: insertPhoneNumber,
      phoneNumberVerified:
        insertPhoneNumber === phoneNumber ? phoneNumberVerified : false,
      image: clerkUser.imageUrl,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create user",
    });
  }

  return created;
}
