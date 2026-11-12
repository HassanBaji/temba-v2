import type { DbClient } from "@repo/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { games } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import {
  participantGameIdsForViewer,
  queryHubGames,
  toHubListRow,
  applyViewerLevelRangeToHubRows,
  expandDrawnTournamentHubRows,
  sortExpandedHubListRows,
  viewerHubContext,
  viewerIsParticipantOnRow,
  type HubQueryRow,
} from "#src/games/helpers/hub-list";
import { hubGameMayBeLive } from "#src/games/helpers/hub-may-be-live";
import type { HubListRow } from "#src/games/utils";
import { filterAndSortMyGamesHubGames } from "#src/home/upcoming-games";

const FOOTBALL_RESULT_DAYS = 14;
const FOOTBALL_RESULT_MS = FOOTBALL_RESULT_DAYS * 24 * 60 * 60 * 1000;

/**
 * A football Game whose window has passed stays in My Games while its Score
 * is missing or unconfirmed, for the players on its teams and its creator,
 * for two weeks after kick-off.
 */
function footballResultPending(row: HubQueryRow, userId: string, now: Date) {
  if (!isFootballGame(row) || row.windowEnd == null) {
    return false;
  }
  const age = now.getTime() - row.windowEnd.getTime();
  if (age > FOOTBALL_RESULT_MS) {
    return false;
  }
  const match = row.matches.find((item) => item.status !== "cancelled");
  if (!match || match.status === "completed") {
    return false;
  }
  if (row.createdBy === userId) {
    return true;
  }
  return row.teams.some(
    (team) =>
      (team.id === match.slot1GameTeamId ||
        team.id === match.slot2GameTeamId) &&
      team.players.some((link) => link.gamePlayer?.user?.id === userId),
  );
}

export async function listMyGamesHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE,
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId, locale);
  const participantGameIds = await participantGameIdsForViewer(
    database,
    userId,
    viewer.myTeamIds,
  );
  const scope = [eq(games.createdBy, userId)];
  if (viewer.memberGroupIds.size > 0) {
    scope.push(inArray(games.groupId, [...viewer.memberGroupIds]));
  }
  if (participantGameIds.size > 0) {
    scope.push(inArray(games.id, [...participantGameIds]));
  }
  const rows = await queryHubGames(
    database,
    and(
      isNull(games.cancelledAt),
      or(...scope),
      hubGameMayBeLive(database, now, FOOTBALL_RESULT_MS),
    ),
  );
  const candidates = (rows as HubQueryRow[]).map((row) => ({
    ...row,
    viewerIsParticipant: viewerIsParticipantOnRow(row, viewer),
  }));
  const upcoming = filterAndSortMyGamesHubGames(
    candidates,
    viewer.memberGroupIds,
    viewer.userId,
    now,
  );
  const listed = new Set(upcoming.map((row) => row.id));
  const filtered = [
    ...candidates.filter(
      (row) => !listed.has(row.id) && footballResultPending(row, userId, now),
    ),
    ...upcoming,
  ];
  const hubRows = await applyViewerLevelRangeToHubRows(
    database,
    filtered.map((row) => toHubListRow(row, viewer, now)),
    filtered,
    userId,
  );
  const byId = new Map(filtered.map((row) => [row.id, row]));
  return sortExpandedHubListRows(
    hubRows.flatMap((row) => {
      const source = byId.get(row.id);
      if (!source) {
        return [row];
      }
      return expandDrawnTournamentHubRows(source, row, viewer);
    }),
  );
}
