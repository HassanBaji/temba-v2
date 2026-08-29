import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { user } from "@repo/db";

import { db } from "~/server/db";

/**
 * Resolve the Temba User row for the authenticated Clerk session by clerkId.
 * Foreign keys use Temba User ids; Clerk remains the only identity provider.
 * User rows are created by the Clerk user.created webhook.
 */
export async function resolveAppUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.clerkId, clerkId),
  });

  if (!existing) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  return existing;
}
