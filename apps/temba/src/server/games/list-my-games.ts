import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { games } from "@repo/db";

import {
  participantGameIdsForViewer,
  queryHubGames,
  toHubListRow,
  applyViewerLevelRangeToHubRows,
  viewerHubContext,
  viewerIsParticipantOnRow,
  type HubQueryRow,
} from "~/server/games/helpers/hub-list";
import type { HubListRow } from "~/server/games/utils";
import { filterAndSortMyGamesHubGames } from "~/server/home/upcoming-games";
import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export async function listMyGamesHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId);
  const participantGameIds = await participantGameIdsForViewer(
    database,
    userId,
    viewer.myTeamIds,
  );
  const scope = [and(eq(games.isPublic, false), eq(games.createdBy, userId))!];
  if (viewer.memberGroupIds.size > 0) {
    scope.push(inArray(games.groupId, [...viewer.memberGroupIds]));
  }
  if (participantGameIds.size > 0) {
    scope.push(
      and(
        eq(games.isPublic, false),
        inArray(games.id, [...participantGameIds]),
      )!,
    );
  }
  const rows = await queryHubGames(
    database,
    and(isNull(games.cancelledAt), or(...scope)),
  );
  const filtered = filterAndSortMyGamesHubGames(
    (rows as HubQueryRow[]).map((row) => ({
      ...row,
      viewerIsParticipant: viewerIsParticipantOnRow(row, viewer),
    })),
    viewer.memberGroupIds,
    viewer.userId,
    now,
  );
  return applyViewerLevelRangeToHubRows(
    database,
    filtered.map((row) => toHubListRow(row, viewer, now)),
    filtered,
    userId,
  );
}
