import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { courts } from "@repo/db";

import { isUniqueViolation } from "~/server/db/is-unique-violation";
import {
  courtNameTaken,
  duplicateCourtMessage,
} from "~/server/venues/helpers/court-name-taken";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function renameCourt(
  database: DbClient,
  args: { courtId: string; name: string },
) {
  const existing = await database.query.courts.findFirst({
    where: eq(courts.id, args.courtId),
    columns: { id: true, venueId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Court not found" });
  }

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
