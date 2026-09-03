import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { coordToDecimal } from "~/server/venues/helpers/coord-to-decimal";
import {
  duplicateVenueMessage,
  venueIdentityTaken,
} from "~/server/venues/helpers/venue-identity-taken";

type DbClient = typeof db;

export async function updateVenue(
  database: DbClient,
  args: {
    id: string;
    name: string;
    city: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
  },
) {
  const existing = await database.query.venues.findFirst({
    where: eq(venues.id, args.id),
    columns: { id: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  if (
    await venueIdentityTaken(
      database,
      args.name,
      args.city,
      args.country,
      args.id,
    )
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: duplicateVenueMessage,
    });
  }

  try {
    const [updated] = await database
      .update(venues)
      .set({
        name: args.name,
        city: args.city,
        country: args.country,
        latitude: coordToDecimal(args.latitude),
        longitude: coordToDecimal(args.longitude),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, args.id))
      .returning({
        id: venues.id,
        name: venues.name,
        city: venues.city,
        country: venues.country,
        latitude: venues.latitude,
        longitude: venues.longitude,
        createdAt: venues.createdAt,
        updatedAt: venues.updatedAt,
      });

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update Venue",
      });
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: duplicateVenueMessage,
      });
    }
    throw error;
  }
}

export const update = operatorProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
      city: z.string().trim().min(1).max(255),
      country: z.string().trim().min(1).max(255),
      latitude: z.number().gte(-90).lte(90).nullable().optional(),
      longitude: z.number().gte(-180).lte(180).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return updateVenue(ctx.db, {
      id: input.id,
      name: input.name,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
    });
  });
