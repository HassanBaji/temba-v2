/**
 * Home hero carousel list: Games the signed-in User has Game admit on or
 * organizes. Live Games stay for the whole window. After the window, at-cap
 * Games with a Match that can still be scored stay until every remaining
 * Match is completed (Americano is not retained). Dedicated to Home — not
 * the Games hub My Groups filter. Hub lists and `isGameLive` stay unchanged.
 */

import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { communityMembers, gamePlayers, games, groups } from "@repo/db";

import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  isStaffRole,
} from "~/server/games/access";
import {
  queryHubGames,
  toHubListRow,
  viewerHubContext,
  type HubQueryRow,
} from "~/server/games/helpers/hub-list";
import type { HubListRow } from "~/server/games/utils";
import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";
import {
  gameListTime,
  isGameLive,
  type GameListCandidate,
} from "~/server/home/upcoming-games";

type DbClient = typeof db | TestDatabase;

export type HomeCarouselPhase = "upcoming" | "ongoing" | "needs_results";

export type HomeCarouselCandidate = GameListCandidate & {
  createdBy: string;
  viewerHasGameAdmit: boolean;
  viewerIsOrganizer: boolean;
  registrationMode: string;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  registeredUserCount: number;
  registeredTeamCount: number;
};

export type HomeCarouselGame = HubListRow & {
  phase: HomeCarouselPhase;
  canAddResults: boolean;
};

const PHASE_ORDER: Record<HomeCarouselPhase, number> = {
  needs_results: 0,
  ongoing: 1,
  upcoming: 2,
};

function matchIsOpenForSets(status: string | null) {
  return status !== "completed" && status !== "cancelled";
}

export function isHomeCarouselAtCap(game: {
  registrationMode: string;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  registeredUserCount: number;
  registeredTeamCount: number;
}) {
  if (game.registrationMode === "team_only") {
    return (
      game.registeredTeamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)
    );
  }
  return (
    game.registeredUserCount >=
    (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED)
  );
}

export function isHomeCarouselNeedsResults(
  game: HomeCarouselCandidate,
  now: Date,
): boolean {
  if (game.cancelledAt !== null) {
    return false;
  }
  if (isGameLive(game, now)) {
    return false;
  }
  if (game.format === "americano") {
    return false;
  }
  if (!isHomeCarouselAtCap(game)) {
    return false;
  }
  return game.matches.some((match) => matchIsOpenForSets(match.status));
}

export function homeCarouselPhase(
  game: HomeCarouselCandidate,
  now: Date,
): HomeCarouselPhase | null {
  if (isHomeCarouselNeedsResults(game, now)) {
    return "needs_results";
  }
  if (!isGameLive(game, now)) {
    return null;
  }
  const start = game.windowStart ?? gameListTime(game);
  if (start.getTime() > now.getTime()) {
    return "upcoming";
  }
  return "ongoing";
}

export function isHomeCarouselGame(
  game: HomeCarouselCandidate,
  now: Date,
): boolean {
  if (!game.viewerHasGameAdmit && !game.viewerIsOrganizer) {
    return false;
  }
  return homeCarouselPhase(game, now) != null;
}

function compareHomeCarouselGames(
  a: HomeCarouselCandidate,
  b: HomeCarouselCandidate,
  now: Date,
): number {
  const phaseA = homeCarouselPhase(a, now);
  const phaseB = homeCarouselPhase(b, now);
  const orderA = phaseA ? PHASE_ORDER[phaseA] : 99;
  const orderB = phaseB ? PHASE_ORDER[phaseB] : 99;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return gameListTime(a).getTime() - gameListTime(b).getTime();
}

export function filterAndSortHomeCarouselGames<T extends HomeCarouselCandidate>(
  games: readonly T[],
  now: Date,
): T[] {
  return games
    .filter((game) => isHomeCarouselGame(game, now))
    .sort((a, b) => compareHomeCarouselGames(a, b, now));
}

async function organizerGroupIdsForViewer(
  database: DbClient,
  userId: string,
): Promise<Set<string>> {
  const created = await database.query.groups.findMany({
    where: eq(groups.createdBy, userId),
    columns: { id: true },
  });
  const staffMemberships = await database.query.communityMembers.findMany({
    where: eq(communityMembers.userId, userId),
    columns: { communityId: true, role: true },
  });
  const staffCommunityIds = staffMemberships
    .filter((row) => isStaffRole(row.role))
    .map((row) => row.communityId);
  const staffGroups =
    staffCommunityIds.length === 0
      ? []
      : await database.query.groups.findMany({
          where: inArray(groups.communityId, staffCommunityIds),
          columns: { id: true },
        });
  return new Set([
    ...created.map((row) => row.id),
    ...staffGroups.map((row) => row.id),
  ]);
}

async function admittedGameIdsForViewer(
  database: DbClient,
  userId: string,
): Promise<Set<string>> {
  const players = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { gameId: true },
  });
  return new Set(players.map((row) => row.gameId));
}

function viewerIsOrganizerOnRow(
  row: Pick<HubQueryRow, "groupId" | "createdBy">,
  userId: string,
  organizerGroupIds: ReadonlySet<string>,
) {
  if (row.groupId == null) {
    return row.createdBy === userId;
  }
  return organizerGroupIds.has(row.groupId);
}

function occupancyFromRow(row: HubQueryRow) {
  return {
    registrationMode: row.registrationMode,
    playersAllowed: row.playersAllowed,
    teamsAllowed: row.teamsAllowed,
    registeredUserCount: row.players.length,
    registeredTeamCount: row.teams.length,
  };
}

function teamOccupantCount(row: HubQueryRow, teamId: string) {
  const team = row.teams.find((item) => item.id === teamId);
  if (!team) {
    return 0;
  }
  return team.players.filter((link) => link.gamePlayer?.user).length;
}

function viewerCanScoreMatch(
  row: HubQueryRow,
  match: HubQueryRow["matches"][number],
  userId: string,
  organizer: boolean,
) {
  if (row.format === "americano") {
    return false;
  }
  if (!matchIsOpenForSets(match.status)) {
    return false;
  }
  if (!match.slot1GameTeamId || !match.slot2GameTeamId) {
    return false;
  }
  if (
    teamOccupantCount(row, match.slot1GameTeamId) !== 2 ||
    teamOccupantCount(row, match.slot2GameTeamId) !== 2
  ) {
    return false;
  }
  if (organizer) {
    return true;
  }
  return row.teams.some(
    (team) =>
      (team.id === match.slot1GameTeamId ||
        team.id === match.slot2GameTeamId) &&
      team.players.some((link) => link.gamePlayer?.user?.id === userId),
  );
}

function viewerCanAddResults(
  row: HubQueryRow,
  userId: string,
  organizer: boolean,
) {
  return row.matches.some((match) =>
    viewerCanScoreMatch(row, match, userId, organizer),
  );
}

export async function listHomeCarouselGames(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<HomeCarouselGame[]> {
  const organizerGroupIds = await organizerGroupIdsForViewer(database, userId);
  const admittedGameIds = await admittedGameIdsForViewer(database, userId);

  const scope = [eq(games.createdBy, userId)];
  if (admittedGameIds.size > 0) {
    scope.push(inArray(games.id, [...admittedGameIds]));
  }
  if (organizerGroupIds.size > 0) {
    scope.push(inArray(games.groupId, [...organizerGroupIds]));
  }

  const rows = await queryHubGames(
    database,
    and(isNull(games.cancelledAt), or(...scope)),
  );
  const viewer = await viewerHubContext(database, userId);
  const candidates = (rows as HubQueryRow[]).map((row) => ({
    ...row,
    viewerHasGameAdmit: row.players.some((player) => player.userId === userId),
    viewerIsOrganizer: viewerIsOrganizerOnRow(row, userId, organizerGroupIds),
    ...occupancyFromRow(row),
  }));
  const filtered = filterAndSortHomeCarouselGames(candidates, now);

  return filtered.map((row) => {
    const phase = homeCarouselPhase(row, now) ?? "upcoming";
    return {
      ...toHubListRow(row, viewer, now),
      phase,
      canAddResults:
        phase === "needs_results" &&
        viewerCanAddResults(row, userId, row.viewerIsOrganizer),
    };
  });
}
