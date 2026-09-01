import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { coordToDecimal } from "~/server/venues/helpers/coord-to-decimal";
import {
  duplicateVenueMessage,
  venueIdentityTaken,
} from "~/server/venues/helpers/venue-identity-taken";
import { type db } from "~/server/db";

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
