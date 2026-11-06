import { z } from "zod";

import { operatorProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { commit, throwCommitFailure } from "#src/soft-archive";
import { requireVenue } from "#src/venues/helpers/require-venue";

type DbClient = typeof db;

export async function softArchive(
  database: DbClient,
  args: { venueId: string },
) {
  await requireVenue(database, args.venueId);

  // Soft-archive hides the Venue from Venue pickers and stops new Group link
  // requests. Edits stay allowed. Linked Groups are not unlinked.
  const updated = await commit(database, { venueId: args.venueId }, "archived");
  if (!updated.ok) {
    throwCommitFailure(updated, "Venue");
  }

  return {
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}

export const softArchiveProcedure = operatorProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return softArchive(ctx.db, { venueId: input.id });
  });
