import { and, eq, isNull } from "drizzle-orm";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  gameMemberInvites,
  ratings,
  teamMembers,
  teams,
} from "@repo/db";

import { formatLevel, levelFromMu } from "~/server/ratings/level";
import { isGameOrganizer } from "~/server/games/access";
import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";
import type { AdmitParty } from "~/server/games/utils";

type AppTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type LevelRangeDb = typeof db | TestDatabase | AppTx;

export type LevelRangeGame = {
  id: string;
  sport: string | null;
  createdBy: string;
  groupId: string | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
};

export function gameHasLevelRange(game: LevelRangeGame) {
  return game.levelMinTenths != null || game.levelMaxTenths != null;
}

export async function displayedLevelTenthsForUser(
  database: LevelRangeDb,
  userId: string,
  sport: string | null,
): Promise<number | null> {
  const ratingSport = sport === "football" ? "football" : "padel";
  const rating = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, ratingSport)),
    columns: { mu: true },
  });
  if (!rating) {
    return null;
  }
  const label = formatLevel(levelFromMu(rating.mu));
  return Math.round(Number(label) * 10);
}

export function displayedLevelPassesRange(
  tenths: number,
  game: LevelRangeGame,
) {
  if (game.levelMinTenths != null && tenths < game.levelMinTenths) {
    return false;
  }
  if (game.levelMaxTenths != null && tenths > game.levelMaxTenths) {
    return false;
  }
  return true;
}

async function hasApprovedWaiver(
  database: LevelRangeDb,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gameLevelRangeRequests.findFirst({
    where: and(
      eq(gameLevelRangeRequests.gameId, gameId),
      eq(gameLevelRangeRequests.userId, userId),
      eq(
        gameLevelRangeRequests.status,
        GameLevelRangeRequestStatusEnum.APPROVED,
      ),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

async function hasLiveUnusedLookupInvite(
  database: LevelRangeDb,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gameMemberInvites.findFirst({
    where: and(
      eq(gameMemberInvites.gameId, gameId),
      eq(gameMemberInvites.userId, userId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

export async function userAllowedByLevelRange(
  database: LevelRangeDb,
  game: LevelRangeGame,
  userId: string,
): Promise<boolean> {
  if (!gameHasLevelRange(game)) {
    return true;
  }
  if (await isGameOrganizer(database, game, userId)) {
    return true;
  }
  if (await hasApprovedWaiver(database, game.id, userId)) {
    return true;
  }
  if (await hasLiveUnusedLookupInvite(database, game.id, userId)) {
    return true;
  }
  const tenths = await displayedLevelTenthsForUser(
    database,
    userId,
    game.sport,
  );
  if (tenths == null) {
    return false;
  }
  return displayedLevelPassesRange(tenths, game);
}

export async function partyUserIdsForAdmit(
  database: LevelRangeDb,
  party: AdmitParty,
): Promise<string[] | null> {
  if (party.kind === "user") {
    return [party.userId];
  }
  if (party.kind === "pair") {
    return [...party.userIds];
  }
  const team = await database.query.teams.findFirst({
    where: eq(teams.id, party.teamId),
    columns: { id: true },
  });
  if (!team) {
    return null;
  }
  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, party.teamId),
    columns: { userId: true },
  });
  if (members.length !== 2) {
    return null;
  }
  return members.map((member) => member.userId);
}
