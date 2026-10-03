import { z } from "zod";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { commit, throwCommitFailure } from "~/server/soft-archive";
import { requireVenue } from "~/server/venues/helpers/require-venue";

type DbClient = typeof db;

export async function softArchive(
  database: DbClient,
  args: { venueId: string },
) {
  await requireVenue(database, args.venueId);

  // Soft-archive hides the Venue from the Community request catalog.
  // Edits stay allowed. Live Community pointers are not cleared.
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
