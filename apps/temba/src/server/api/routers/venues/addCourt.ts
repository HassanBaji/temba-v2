import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { courts } from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { isUniqueViolation } from "~/server/db/is-unique-violation";
import {
  courtNameTaken,
  duplicateCourtMessage,
} from "~/server/venues/helpers/court-name-taken";
import { requireVenue } from "~/server/venues/helpers/require-venue";

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

export const addCourtProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return addCourt(ctx.db, {
      venueId: input.venueId,
      name: input.name,
    });
  });
