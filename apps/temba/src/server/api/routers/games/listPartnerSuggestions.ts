import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  ratings,
  user,
} from "@repo/db";

import type { LevelBand } from "~/lib/level-bands";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { assertCanRegisterWithPartner } from "~/server/games/helpers/assert-can-register-with-partner";
import { gameHideRegisteredWaitlistedSelf } from "~/server/games/helpers/game-hide-registered-waitlisted-self";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const SUGGESTION_CAP = 20;

export type PartnerSuggestionIneligible =
  | "already_on_game"
  | "waitlisted"
  | "level_range";

export type PartnerSuggestion = {
  id: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  preferredPosition: "left" | "right" | null;
  gamesTogether: number;
  ineligible: PartnerSuggestionIneligible | null;
};

export type ListPartnerSuggestionsResult = {
  playedWithBefore: PartnerSuggestion[];
  fromYourGroups: PartnerSuggestion[];
};

const mineGtp = alias(gameTeamPlayers, "mine_gtp");
const mineGp = alias(gamePlayers, "mine_gp");
const partnerGtp = alias(gameTeamPlayers, "partner_gtp");
const partnerGp = alias(gamePlayers, "partner_gp");

function preferredSeat(
  value: string | null | undefined,
): "left" | "right" | null {
  return value === "left" || value === "right" ? value : null;
}

function classifyIneligible(
  userId: string,
  seatedIds: Set<string>,
  hideIds: Set<string>,
  levelOk: boolean,
): PartnerSuggestionIneligible | null {
  if (seatedIds.has(userId)) {
    return "already_on_game";
  }
  if (hideIds.has(userId)) {
    return "waitlisted";
  }
  if (!levelOk) {
    return "level_range";
  }
  return null;
}

async function hydrateSuggestions(
  database: DbClient,
  args: {
    game: Awaited<ReturnType<typeof requireGame>>;
    userIds: string[];
    gamesTogetherByUserId: Map<string, number>;
    seatedIds: Set<string>;
    hideIds: Set<string>;
  },
): Promise<PartnerSuggestion[]> {
  if (args.userIds.length === 0) {
    return [];
  }

  const people = await database.query.user.findMany({
    where: inArray(user.id, args.userIds),
    columns: {
      id: true,
      name: true,
      image: true,
      preferredPosition: true,
    },
  });
  const byId = new Map(people.map((row) => [row.id, row]));

  const ratingSport: "padel" | "football" =
    args.game.sport === "football" ? "football" : "padel";
  const ratingRows = await database.query.ratings.findMany({
    where: and(
      inArray(ratings.userId, args.userIds),
      eq(ratings.sport, ratingSport),
    ),
    columns: { userId: true, levelBand: true },
  });
  const levelBandByUserId = new Map<string, LevelBand>();
  for (const row of ratingRows) {
    levelBandByUserId.set(row.userId, row.levelBand);
  }

  const levelOkEntries = await Promise.all(
    args.userIds.map(async (userId) => {
      const allowed = await userAllowedByLevelRange(
        database,
        args.game,
        userId,
      );
      return [userId, allowed] as const;
    }),
  );
  const levelOkByUserId = new Map(levelOkEntries);

  const suggestions: PartnerSuggestion[] = [];
  for (const userId of args.userIds) {
    const person = byId.get(userId);
    if (!person) {
      continue;
    }
    suggestions.push({
      id: person.id,
      name: person.name,
      image: person.image ?? null,
      levelBand: levelBandByUserId.get(person.id) ?? null,
      preferredPosition: preferredSeat(person.preferredPosition),
      gamesTogether: args.gamesTogetherByUserId.get(person.id) ?? 0,
      ineligible: classifyIneligible(
        person.id,
        args.seatedIds,
        args.hideIds,
        levelOkByUserId.get(person.id) ?? false,
      ),
    });
  }
  return suggestions;
}

export async function listPartnerSuggestions(
  database: DbClient,
  args: { gameId: string; userId: string },
): Promise<ListPartnerSuggestionsResult> {
  const game = await requireGame(database, args.gameId);
  const now = new Date();
  await assertCanRegisterWithPartner(database, game, args.userId, now);

  if (!game.isPublic && !game.groupId) {
    return { playedWithBefore: [], fromYourGroups: [] };
  }

  const hideIds = new Set(
    await gameHideRegisteredWaitlistedSelf(database, game.id, args.userId),
  );
  const seatedRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { userId: true },
  });
  const seatedIds = new Set(
    seatedRows
      .map((row) => row.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );

  const playedRows = await database
    .select({
      userId: partnerGp.userId,
      gamesTogether: sql<number>`cast(count(distinct ${gameTeams.gameId}) as int)`,
    })
    .from(mineGtp)
    .innerJoin(mineGp, eq(mineGp.id, mineGtp.gamePlayerId))
    .innerJoin(gameTeams, eq(gameTeams.id, mineGtp.gameTeamId))
    .innerJoin(games, eq(games.id, gameTeams.gameId))
    .innerJoin(partnerGtp, eq(partnerGtp.gameTeamId, mineGtp.gameTeamId))
    .innerJoin(partnerGp, eq(partnerGp.id, partnerGtp.gamePlayerId))
    .where(
      and(eq(mineGp.userId, args.userId), ne(partnerGp.userId, args.userId)),
    )
    .groupBy(partnerGp.userId)
    .orderBy(
      sql`max(coalesce(${games.windowStart}, ${gameTeams.createdAt})) desc`,
    )
    .limit(SUGGESTION_CAP);

  const playedIds: string[] = [];
  const gamesTogetherByUserId = new Map<string, number>();
  for (const row of playedRows) {
    if (!row.userId) {
      continue;
    }
    playedIds.push(row.userId);
    gamesTogetherByUserId.set(row.userId, Number(row.gamesTogether));
  }

  const playedWithBefore = await hydrateSuggestions(database, {
    game,
    userIds: playedIds,
    gamesTogetherByUserId,
    seatedIds,
    hideIds,
  });

  if (!game.groupId) {
    return { playedWithBefore, fromYourGroups: [] };
  }

  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, game.groupId),
    columns: { userId: true },
  });
  const playedIdSet = new Set(playedIds);
  const groupUserIds = members
    .map((row) => row.userId)
    .filter((userId) => userId !== args.userId && !playedIdSet.has(userId));

  const groupPeople =
    groupUserIds.length === 0
      ? []
      : await database.query.user.findMany({
          where: inArray(user.id, groupUserIds),
          columns: { id: true, name: true },
        });
  groupPeople.sort((a, b) => a.name.localeCompare(b.name));
  const groupIds = groupPeople.slice(0, SUGGESTION_CAP).map((row) => row.id);

  const fromYourGroups = await hydrateSuggestions(database, {
    game,
    userIds: groupIds,
    gamesTogetherByUserId: new Map(),
    seatedIds,
    hideIds,
  });

  return { playedWithBefore, fromYourGroups };
}

export const listPartnerSuggestionsProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listPartnerSuggestions(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
