import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { courts } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function deleteCourt(
  database: DbClient,
  args: { courtId: string; actor: Actor },
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

  // The Booking guard goes here: refuse while the Court has an occupying
  // Booking with endsAt > now ("Cancel its Bookings first").

  await database.delete(courts).where(eq(courts.id, args.courtId));
  return { id: existing.id };
}

export const deleteCourtProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deleteCourt(ctx.db, {
      courtId: input.id,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
