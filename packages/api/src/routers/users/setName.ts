import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import {
  USER_NAME_MAX_LENGTH,
  userDisplayName,
} from "@repo/domain/user-display-name";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const nameField = z.string().trim().min(1).max(USER_NAME_MAX_LENGTH);

export const setNameSchema = z.object({
  firstName: nameField,
  lastName: nameField,
});

/**
 * Write the caller's first and last name and rebuild `name` from them. Clerk
 * holds the same values (the client updates Clerk first, and the
 * `user.updated` webhook writes these columns again); this door is what makes
 * the change visible in the product without waiting for that webhook.
 */
export async function writeUserName(
  database: DbClient,
  args: { userId: string; firstName: string; lastName: string },
) {
  const name = userDisplayName(args);
  if (!name) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter your name" });
  }
  const [updated] = await database
    .update(user)
    .set({
      firstName: args.firstName,
      lastName: args.lastName,
      name,
      updatedAt: new Date(),
    })
    .where(eq(user.id, args.userId))
    .returning({
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
    });

  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  return updated;
}

export const setName = protectedProcedure
  .input(setNameSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writeUserName(ctx.db, { userId: appUser.id, ...input });
  });
