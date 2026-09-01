import { commit, throwCommitFailure } from "~/server/soft-archive";
import { requireVenue } from "~/server/venues/helpers/require-venue";
import { type db } from "~/server/db";

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
