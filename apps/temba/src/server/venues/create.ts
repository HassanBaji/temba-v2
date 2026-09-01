import { TRPCError } from "@trpc/server";

import { venues } from "@repo/db";

import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { coordToDecimal } from "~/server/venues/helpers/coord-to-decimal";
import {
  duplicateVenueMessage,
  venueIdentityTaken,
} from "~/server/venues/helpers/venue-identity-taken";
import { type db } from "~/server/db";

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
