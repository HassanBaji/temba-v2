import type { DbClient } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";

import { games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  applyViewerLevelRangeToHubRows,
  queryHubGames,
  toHubListRow,
  viewerHubContext,
  type HubQueryRow,
} from "#src/games/helpers/hub-list";
import type { HubListRow } from "#src/games/utils";
import { filterAndSortPublicHubGames } from "#src/home/upcoming-games";

export async function listPublicHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId);
  const rows = await queryHubGames(
    database,
    and(eq(games.isPublic, true), isNull(games.cancelledAt)),
  );
  const filtered = filterAndSortPublicHubGames(
    (rows as HubQueryRow[]).map((row) => ({
      ...row,
      communityArchivedAt: row.group?.community?.archivedAt ?? null,
    })),
    viewer.memberGroupIds,
    now,
  );
  return applyViewerLevelRangeToHubRows(
    database,
    filtered.map((row) => toHubListRow(row, viewer, now)),
    filtered,
    userId,
  );
}

/**
 * Public pickup Games (parent events). Live `isPublic` Games only.
 * Soft-archived Community Club Group Games are excluded; the Game
 * `isPublic` row flag is not flipped. Groupless public Games are included.
 * Games already listed on My Games are excluded (My Games preferred).
 */
export const listPublicPickup = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listPublicHubRows(ctx.db, appUser.id);
});
