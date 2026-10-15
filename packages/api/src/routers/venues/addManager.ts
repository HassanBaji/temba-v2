import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venueManagers, venues } from "@repo/db";
import type { DbClient } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { operatorProcedure } from "#src/trpc";

export async function addManager(
  database: DbClient,
  args: { venueId: string; userId: string; grantedByUserId: string | null },
) {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: { id: true },
  });
  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const target = await database.query.user.findFirst({
    where: (table, { eq }) => eq(table.id, args.userId),
    columns: { id: true },
  });
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  try {
    const [created] = await database
      .insert(venueManagers)
      .values({
        venueId: args.venueId,
        userId: args.userId,
        grantedByUserId: args.grantedByUserId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add Venue manager",
      });
    }

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This User already manages this Venue",
      });
    }
    throw error;
  }
}

export const addManagerProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const caller = await resolveAppUser(ctx.userId);
    return addManager(ctx.db, {
      venueId: input.venueId,
      userId: input.userId,
      grantedByUserId: caller.id,
    });
  });
