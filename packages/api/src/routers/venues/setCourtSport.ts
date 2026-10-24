import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { courts } from "@repo/db";
import { type Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function setCourtSport(
  database: DbClient,
  args: { courtId: string; sport: Sport; actor: Actor },
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

  const [updated] = await database
    .update(courts)
    .set({ sport: args.sport, updatedAt: new Date() })
    .where(eq(courts.id, args.courtId))
    .returning({
      id: courts.id,
      venueId: courts.venueId,
      name: courts.name,
      sport: courts.sport,
      createdAt: courts.createdAt,
      updatedAt: courts.updatedAt,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to set Court sport",
    });
  }

  return updated;
}

export const setCourtSportProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid(), sport: sportSchema }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setCourtSport(ctx.db, {
      courtId: input.id,
      sport: input.sport,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
