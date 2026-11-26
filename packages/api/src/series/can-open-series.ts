import { type groups } from "@repo/db";

import { type db } from "#src/db";
import { canViewGroup } from "#src/groups/helpers/assert-can-view-group";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type SeriesGroup = Pick<
  typeof groups.$inferSelect,
  "id" | "type" | "createdBy" | "venueId" | "deletedAt"
>;

/**
 * Whether a viewer may follow a Series to its page and its Games: they may
 * view its Group. A deleted Group's Series page is gone, while its badges stay
 * on profiles.
 */
export async function canOpenSeries(
  database: DbClient,
  group: SeriesGroup,
  viewerId: string,
  getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>,
) {
  if (group.deletedAt !== null) {
    return false;
  }
  return canViewGroup(database, group, viewerId, getPublicMetadata);
}
