import { commit, throwCommitFailure } from "~/server/soft-archive";
import { requireVenue } from "~/server/venues/helpers/require-venue";
import { type db } from "~/server/db";

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
