import { TRPCError } from "@trpc/server";
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

export async function createVenue(
  database: DbClient,
  args: {
    name: string;
    city: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
  },
) {
  if (await venueIdentityTaken(database, args.name, args.city, args.country)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: duplicateVenueMessage,
    });
  }

  try {
    const [created] = await database
      .insert(venues)
      .values({
        name: args.name,
        city: args.city,
        country: args.country,
        latitude: coordToDecimal(args.latitude),
        longitude: coordToDecimal(args.longitude),
      })
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

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Venue",
      });
    }

    return created;
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

export const create = operatorProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(255),
      city: z.string().trim().min(1).max(255),
      country: z.string().trim().min(1).max(255),
      latitude: z.number().gte(-90).lte(90).nullable().optional(),
      longitude: z.number().gte(-180).lte(180).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return createVenue(ctx.db, {
      name: input.name,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
    });
  });
