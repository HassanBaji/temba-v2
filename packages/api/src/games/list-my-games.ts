import type { DbClient } from "@repo/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { games } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
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

const RESULT_PENDING_DAYS = 14;
const RESULT_PENDING_MS = RESULT_PENDING_DAYS * 24 * 60 * 60 * 1000;

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
  if (age > RESULT_PENDING_MS) {
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

/**
 * King of the court has no Matches to keep it live, so once its window has
 * passed it stays in My Games for its Organizer until the final order is
 * posted, for two weeks. Without it a non-playing Organizer has no way in.
 */
function kingFinalOrderPending(row: HubQueryRow, userId: string, now: Date) {
  if (
    !isKingOfTheCourt(row.format, row.tournamentShape) ||
    row.drawPostedAt == null ||
    row.windowEnd == null ||
    row.createdBy !== userId
  ) {
    return false;
  }
  return now.getTime() - row.windowEnd.getTime() <= RESULT_PENDING_MS;
}

export type ListMyGamesOptions = {
  /**
   * Keep a posted Groups only tournament the viewer plays in as one row
   * (the Games list, ADR-0074) instead of one row per open Pool Match (Home).
   */
  groupTournaments?: boolean;
};

export async function listMyGamesHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE,
  options: ListMyGamesOptions = {},
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
      hubGameMayBeLive(database, now, RESULT_PENDING_MS),
    ),
  );
  const candidates = (rows as HubQueryRow[])
    // A King of the court Game moves to Played once its final order is posted.
    .filter((row) => row.finalOrderPostedAt == null)
    .map((row) => ({
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
      (row) =>
        !listed.has(row.id) &&
        (footballResultPending(row, userId, now) ||
          kingFinalOrderPending(row, userId, now)),
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
      if (!source || (options.groupTournaments && row.myTournament)) {
        return [row];
      }
      return expandDrawnTournamentHubRows(source, row, viewer);
    }),
  );
}
