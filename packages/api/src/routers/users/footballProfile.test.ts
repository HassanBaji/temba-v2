import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  matchGoals,
  matchSets,
  matches,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { loadFootballProfile } from "#src/routers/users/footballProfile";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromLevel } from "@repo/domain/level";

const T1 = new Date("2026-01-10T12:00:00.000Z");
const NOW = new Date("2026-03-01T12:00:00.000Z");

function at(day: number) {
  return new Date(Date.UTC(2026, 0, day, 18));
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertUser(
  database: TestDatabase,
  name: string,
  values: Partial<typeof user.$inferInsert> = {},
) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com`, ...values })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function seed(database: TestDatabase) {
  const player = await insertUser(database, "Ali Hasan", {
    sports: ["football"],
    preferredFootballRole: "outfield",
    preferredFootballPosition: "fwd",
  });
  const teammate = await insertUser(database, "Omar Saleh");
  const opponent = await insertUser(database, "Yusuf Karim");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Riffa Pitch", city: "Riffa", country: "BH" })
    .returning();
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  return { player, teammate, opponent, venue };
}

type People = Awaited<ReturnType<typeof seed>>;

async function side(
  database: TestDatabase,
  gameId: string,
  sideIndex: number,
  userIds: string[],
) {
  const [team] = await database
    .insert(gameTeams)
    .values({ gameId, sideIndex })
    .returning({ id: gameTeams.id });
  if (!team) {
    throw new Error("Failed to insert game team");
  }
  for (const userId of userIds) {
    const [seat] = await database
      .insert(gamePlayers)
      .values({ gameId, userId })
      .returning({ id: gamePlayers.id });
    if (!seat) {
      throw new Error("Failed to insert game player");
    }
    await database
      .insert(gameTeamPlayers)
      .values({ gameTeamId: team.id, gamePlayerId: seat.id });
  }
  return team;
}

async function playMatch(
  database: TestDatabase,
  people: People,
  args: {
    score: { slot1: number; slot2: number };
    startTime: Date;
    playerSlot?: 1 | 2;
    playerGoals?: number;
    sport?: GameSportEnum;
    cancelledAt?: Date | null;
  },
) {
  const sport = args.sport ?? GameSportEnum.Football;
  const [game] = await database
    .insert(games)
    .values({
      name: "Thursday 5s",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: people.venue.id,
      createdBy: people.opponent.id,
      isPublic: false,
      sport,
      sideSize: sport === GameSportEnum.Football ? 5 : null,
      playersAllowed: 10,
      windowStart: T1,
      windowEnd: T1,
      rated: false,
      cancelledAt: args.cancelledAt ?? null,
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  const ours = [people.player.id, people.teammate.id];
  const theirs = [people.opponent.id];
  const playerSlot = args.playerSlot ?? 1;
  const slot1 = await side(
    database,
    game.id,
    1,
    playerSlot === 1 ? ours : theirs,
  );
  const slot2 = await side(
    database,
    game.id,
    2,
    playerSlot === 1 ? theirs : ours,
  );
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      startTime: args.startTime,
      slot1GameTeamId: slot1.id,
      slot2GameTeamId: slot2.id,
      status: MatchStatusEnum.COMPLETED,
    })
    .returning();
  if (!match) {
    throw new Error("Failed to insert match");
  }
  await database.insert(matchSets).values({
    matchId: match.id,
    setNumber: 1,
    slot1GamesWon: args.score.slot1,
    slot2GamesWon: args.score.slot2,
  });
  if (args.playerGoals) {
    await database.insert(matchGoals).values({
      matchId: match.id,
      userId: people.player.id,
      goals: args.playerGoals,
    });
  }
  return { game, match };
}

describe("loadFootballProfile", () => {
  it("refuses a viewer who shares no Group or Game with the player", async () => {
    await withDb(async (db) => {
      const people = await seed(db);
      const stranger = await insertUser(db, "Stranger");
      await expect(
        loadFootballProfile(db, {
          viewerId: stranger.id,
          playerId: people.player.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("counts football Matches only, read from the player's side", async () => {
    await withDb(async (db) => {
      const people = await seed(db);
      const won = await playMatch(db, people, {
        score: { slot1: 5, slot2: 3 },
        startTime: at(1),
        playerGoals: 2,
      });
      await playMatch(db, people, {
        score: { slot1: 4, slot2: 1 },
        startTime: at(2),
        playerSlot: 2,
        playerGoals: 1,
      });
      await playMatch(db, people, {
        score: { slot1: 2, slot2: 2 },
        startTime: at(3),
      });
      await playMatch(db, people, {
        score: { slot1: 6, slot2: 4 },
        startTime: at(4),
        sport: GameSportEnum.PADEL,
      });
      await playMatch(db, people, {
        score: { slot1: 9, slot2: 0 },
        startTime: at(5),
        cancelledAt: T1,
        playerGoals: 5,
      });

      const result = await loadFootballProfile(db, {
        viewerId: people.opponent.id,
        playerId: people.player.id,
        now: NOW,
      });

      expect(result.overall).toEqual({
        played: 3,
        won: 1,
        lost: 1,
        drawn: 1,
        goals: 3,
      });
      expect(
        result.lastMatches.map((match) => [
          match.outcome,
          match.score,
          match.goals,
        ]),
      ).toEqual([
        ["draw", { us: 2, them: 2 }, 0],
        ["lost", { us: 1, them: 4 }, 1],
        ["won", { us: 5, them: 3 }, 2],
      ]);
      expect(result.lastMatches.at(-1)).toMatchObject({
        gameId: won.game.id,
        game: {
          name: "Thursday 5s",
          groupName: null,
          venueName: "Riffa Pitch",
        },
        canOpenGame: true,
      });
      expect(result.streaks).toMatchObject({ current: 0, best: 1 });
      expect(result.venue).toEqual({ name: "Riffa Pitch" });
    });
  });

  it("returns the football role, Sports played and the starting football Level", async () => {
    await withDb(async (db) => {
      const people = await seed(db);
      await db.insert(ratings).values({
        userId: people.player.id,
        sport: GroupSportEnum.FOOTBALL,
        mu: muFromLevel(3.6),
        phi: 300,
        sigma: 0.06,
        levelBand: "C1",
      });

      const result = await loadFootballProfile(db, {
        viewerId: people.player.id,
        playerId: people.player.id,
        now: NOW,
      });

      expect(result.player.isViewer).toBe(true);
      expect(result.sports).toEqual(["football"]);
      expect(result.role).toEqual({ role: "outfield", position: "fwd" });
      expect(result.rating).toMatchObject({ ratedMatchCount: 0 });
      expect(result.rating?.levelValue).toBeCloseTo(3.6);
      expect(result.overall.played).toBe(0);
      expect(result.lastMatches).toEqual([]);
      expect(result.venue).toBeNull();
    });
  });
});
