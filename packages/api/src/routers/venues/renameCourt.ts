import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { courts } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import {
  courtNameTaken,
  duplicateCourtMessage,
} from "#src/venues/helpers/court-name-taken";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function renameCourt(
  database: DbClient,
  args: { courtId: string; name: string; actor: Actor },
) {
  const existing = await database.query.courts.findFirst({
    where: eq(courts.id, args.courtId),
    columns: { id: true, venueId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Court not found" });
  }

  await requireVenueManager(database, {
    venueId: existing.venueId,
    ...args.actor,
  });

  if (
    await courtNameTaken(database, existing.venueId, args.name, existing.id)
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: duplicateCourtMessage,
    });
  }

  try {
    const [updated] = await database
      .update(courts)
      .set({
        name: args.name,
        updatedAt: new Date(),
      })
      .where(eq(courts.id, args.courtId))
      .returning({
        id: courts.id,
        venueId: courts.venueId,
        name: courts.name,
        createdAt: courts.createdAt,
        updatedAt: courts.updatedAt,
      });

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to rename Court",
      });
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: duplicateCourtMessage,
      });
    }
    throw error;
  }
}

export const renameCourtProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return renameCourt(ctx.db, {
      courtId: input.id,
      name: input.name,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
