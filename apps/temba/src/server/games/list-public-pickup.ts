import { and, eq, isNull } from "drizzle-orm";

import { games } from "@repo/db";

import {
  applyViewerLevelRangeToHubRows,
  queryHubGames,
  toHubListRow,
  viewerHubContext,
  type HubQueryRow,
} from "~/server/games/helpers/hub-list";
import type { HubListRow } from "~/server/games/utils";
import { filterAndSortPublicHubGames } from "~/server/home/upcoming-games";
import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

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
