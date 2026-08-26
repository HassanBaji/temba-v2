import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "@repo/db";

/**
 * Resolve or create the Temba User row for the authenticated Clerk session.
 * Foreign keys use Temba User ids; Clerk remains the only identity provider.
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

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(user)
    .values({
      name,
      email,
      emailVerified: true,
      phoneNumberVerified: false,
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
