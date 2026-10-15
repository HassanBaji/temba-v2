import { TRPCError } from "@trpc/server";
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
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function addCourt(
  database: DbClient,
  args: { venueId: string; name: string; actor: Actor },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

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

export const addCourtProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addCourt(ctx.db, {
      venueId: input.venueId,
      name: input.name,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
