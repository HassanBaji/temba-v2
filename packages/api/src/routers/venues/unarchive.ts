import { z } from "zod";

import { operatorProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { commit, throwCommitFailure } from "#src/soft-archive";
import { requireVenue } from "#src/venues/helpers/require-venue";

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
