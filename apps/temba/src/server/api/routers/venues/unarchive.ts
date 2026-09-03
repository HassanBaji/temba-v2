import { z } from "zod";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { commit, throwCommitFailure } from "~/server/soft-archive";
import { requireVenue } from "~/server/venues/helpers/require-venue";

type DbClient = typeof db;

export async function unarchive(database: DbClient, args: { venueId: string }) {
  await requireVenue(database, args.venueId);

  const updated = await commit(database, { venueId: args.venueId }, "live");
  if (!updated.ok) {
    throwCommitFailure(updated, "Venue");
  }

  return {
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}

export const unarchiveProcedure = operatorProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return unarchive(ctx.db, { venueId: input.id });
  });
