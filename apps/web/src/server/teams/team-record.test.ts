import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  gameTeams,
  games,
  matchSets,
  matches,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import { loadTeamRecord } from "~/server/teams/team-record";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const START = new Date("2026-09-01T18:00:00.000Z");
const END = new Date("2026-09-01T20:00:00.000Z");

async function setup(database: TestDatabase) {
  const [owner] = await database
    .insert(user)
    .values({ name: "Owner", email: "owner@example.com" })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Venue", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  const [ours] = await database
    .insert(teams)
    .values({ createdBy: owner!.id })
    .returning({ id: teams.id });
  const [theirs] = await database
    .insert(teams)
    .values({ createdBy: owner!.id })
    .returning({ id: teams.id });
  return {
    ownerId: owner!.id,
    venueId: venue!.id,
    teamId: ours!.id,
    rivalId: theirs!.id,
  };
}

async function playMatch(
  database: TestDatabase,
  base: Awaited<ReturnType<typeof setup>>,
  args: {
    status: MatchStatusEnum;
    sets: { slot1GamesWon: number; slot2GamesWon: number }[];
    ourSlot?: 1 | 2;
    cancelledGame?: boolean;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Team game",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      venueId: base.venueId,
      createdBy: base.ownerId,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: START,
      windowEnd: END,
      cancelledAt: args.cancelledGame ? new Date() : null,
    })
    .returning({ id: games.id });
  const ourSlot = args.ourSlot ?? 1;
  const [ours] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: base.teamId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [theirs] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: base.rivalId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game!.id,
      startTime: START,
      status: args.status,
      slot1GameTeamId: ourSlot === 1 ? ours!.id : theirs!.id,
      slot2GameTeamId: ourSlot === 1 ? theirs!.id : ours!.id,
    })
    .returning({ id: matches.id });
  let setNumber = 1;
  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: match!.id,
      setNumber: setNumber++,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
  return match!.id;
}

describe("loadTeamRecord", () => {
  it("shows zero played for a new Team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      expect(await loadTeamRecord(db, base.teamId)).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      });
    } finally {
      await close();
    }
  });

  it("counts a win and a loss from completed Matches on either slot", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        ourSlot: 2,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }],
      });
      expect(await loadTeamRecord(db, base.teamId)).toEqual({
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
      });
      expect(await loadTeamRecord(db, base.rivalId)).toEqual({
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
      });
    } finally {
      await close();
    }
  });

  it("counts a draw as played only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 3 },
          { slot1GamesWon: 3, slot2GamesWon: 6 },
        ],
      });
      expect(await loadTeamRecord(db, base.teamId)).toEqual({
        gamesPlayed: 1,
        wins: 0,
        losses: 0,
      });
    } finally {
      await close();
    }
  });

  it("ignores Matches awaiting confirmation, cancelled Matches, Walkovers and cancelled Games", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const base = await setup(db);
      const sets = [{ slot1GamesWon: 6, slot2GamesWon: 2 }];
      await playMatch(db, base, { status: MatchStatusEnum.PENDING, sets });
      await playMatch(db, base, { status: MatchStatusEnum.CANCELLED, sets });
      const walkover = await playMatch(db, base, {
        status: MatchStatusEnum.CANCELLED,
        sets: [],
      });
      await db
        .update(matches)
        .set({
          walkoverGameTeamId: (
            await db.query.matches.findFirst({
              where: eq(matches.id, walkover),
              columns: { slot2GameTeamId: true },
            })
          )?.slot2GameTeamId,
        })
        .where(eq(matches.id, walkover));
      await playMatch(db, base, {
        status: MatchStatusEnum.COMPLETED,
        sets,
        cancelledGame: true,
      });
      expect(await loadTeamRecord(db, base.teamId)).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      });
    } finally {
      await close();
    }
  });
});
