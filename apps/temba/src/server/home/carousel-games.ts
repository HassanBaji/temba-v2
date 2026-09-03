/**
 * Home hero carousel list (TEM-147): live Games the signed-in User has Game
 * admit on or organizes. Dedicated to Home — not the Games hub My Groups
 * filter. Waitlisted-only and unjoined Group members are out. Public Games
 * the User joined are in. Soft-archived Club Group Games still appear when
 * live. Cancelled Games do not. Hub lists and `isGameLive` stay unchanged.
 */

import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { communityMembers, gamePlayers, games, groups } from "@repo/db";

import { isStaffRole } from "~/server/games/access";
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

export type HomeCarouselPhase = "upcoming" | "ongoing";

export type HomeCarouselCandidate = GameListCandidate & {
  createdBy: string;
  viewerHasGameAdmit: boolean;
  viewerIsOrganizer: boolean;
};

export type HomeCarouselGame = HubListRow & {
  phase: HomeCarouselPhase;
};

export function homeCarouselPhase(
  game: GameListCandidate,
  now: Date,
): HomeCarouselPhase | null {
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
  return isGameLive(game, now);
}

function compareHomeCarouselGames(
  a: GameListCandidate,
  b: GameListCandidate,
  now: Date,
): number {
  const phaseA = homeCarouselPhase(a, now);
  const phaseB = homeCarouselPhase(b, now);
  if (phaseA !== phaseB) {
    if (phaseA === "ongoing") {
      return -1;
    }
    if (phaseB === "ongoing") {
      return 1;
    }
    if (phaseA === "upcoming") {
      return -1;
    }
    if (phaseB === "upcoming") {
      return 1;
    }
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
  }));
  const filtered = filterAndSortHomeCarouselGames(candidates, now);

  return filtered.map((row) => {
    const phase = homeCarouselPhase(row, now);
    return {
      ...toHubListRow(row, viewer, now),
      phase: phase ?? "upcoming",
    };
  });
}
