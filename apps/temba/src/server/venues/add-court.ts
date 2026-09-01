import { TRPCError } from "@trpc/server";

import { courts } from "@repo/db";

import { isUniqueViolation } from "~/server/db/is-unique-violation";
import {
  courtNameTaken,
  duplicateCourtMessage,
} from "~/server/venues/helpers/court-name-taken";
import { requireVenue } from "~/server/venues/helpers/require-venue";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function addCourt(
  database: DbClient,
  args: { venueId: string; name: string },
) {
  await requireVenue(database, args.venueId);

  if (await courtNameTaken(database, args.venueId, args.name)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: duplicateCourtMessage,
    });
  }

  try {
    const [created] = await database
      .insert(courts)
      .values({
        venueId: args.venueId,
        name: args.name,
      })
      .returning({
        id: courts.id,
        venueId: courts.venueId,
        name: courts.name,
        createdAt: courts.createdAt,
        updatedAt: courts.updatedAt,
      });

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add Court",
      });
    }

    return created;
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
