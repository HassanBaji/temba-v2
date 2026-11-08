import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  MatchStatusEnum,
  gameTeams,
  games,
  matchSets,
  matches,
  teams,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  loadTeamForm,
  loadTeamMatches,
  loadTeamRecord,
  loadTeamRivals,
  teamFormFromMatches,
  teamRivalsFromMatches,
} from "./team-record";

type Db = Parameters<typeof loadTeamMatches>[0];

const DAY = 24 * 60 * 60 * 1000;
const FIRST = new Date("2026-09-01T18:00:00.000Z");

async function setup(database: TestDatabase, sport: "padel" | "football") {
  const [owner] = await database
    .insert(user)
    .values({ name: "Owner", email: "owner@example.com" })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Seef Courts", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const teamRows = await database
    .insert(teams)
    .values([
      { createdBy: owner!.id, sport },
      { createdBy: owner!.id, sport },
      { createdBy: owner!.id, sport },
    ])
    .returning({ id: teams.id });
  return {
    ownerId: owner!.id,
    venueId: venue!.id,
    sport,
    teamIds: teamRows.map((row) => row.id) as [string, string, string],
  };
}

async function playMatch(
  database: TestDatabase,
  base: Awaited<ReturnType<typeof setup>>,
  args: {
    slot1TeamId: string;
    slot2TeamId: string;
    sets: { slot1GamesWon: number; slot2GamesWon: number }[];
    day: number;
    status?: MatchStatusEnum;
    cancelledGame?: boolean;
  },
) {
  const start = new Date(FIRST.getTime() + args.day * DAY);
  const football = base.sport === "football";
  const [game] = await database
    .insert(games)
    .values({
      name: "Team game",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      sport: football ? GameSportEnum.Football : GameSportEnum.PADEL,
      sideSize: football ? 5 : null,
      venueId: base.venueId,
      createdBy: base.ownerId,
      isPublic: false,
      playersAllowed: football ? 10 : 4,
      teamsAllowed: 2,
      windowStart: start,
      windowEnd: new Date(start.getTime() + 90 * 60 * 1000),
      cancelledAt: args.cancelledGame ? new Date() : null,
    })
    .returning({ id: games.id });
  const [slot1] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: args.slot1TeamId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2] = await database
    .insert(gameTeams)
    .values({ gameId: game!.id, teamId: args.slot2TeamId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game!.id,
      startTime: start,
      status: args.status ?? MatchStatusEnum.COMPLETED,
      slot1GameTeamId: slot1!.id,
      slot2GameTeamId: slot2!.id,
    })
    .returning({ id: matches.id });
  let setNumber = 1;
  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: match!.id,
      setNumber: setNumber++,
      ...set,
    });
  }
}

async function withDb(run: (database: TestDatabase, db: Db) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, db as unknown as Db);
  } finally {
    await close();
  }
}

const WIN = [{ slot1GamesWon: 6, slot2GamesWon: 2 }];
const LOSS = [{ slot1GamesWon: 2, slot2GamesWon: 6 }];

describe("team record, Rivals and head-to-head", () => {
  it("makes two Teams with three Matches each other's Rival, 2–1 and 1–2", async () => {
    await withDb(async (database, db) => {
      const base = await setup(database, "padel");
      const [ours, theirs] = base.teamIds;
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: WIN,
        day: 0,
      });
      await playMatch(database, base, {
        slot1TeamId: theirs,
        slot2TeamId: ours,
        sets: WIN,
        day: 1,
      });
      await playMatch(database, base, {
        slot1TeamId: theirs,
        slot2TeamId: ours,
        sets: LOSS,
        day: 2,
      });

      const oursRivals = await loadTeamRivals(db, ours);
      expect(oursRivals.rivals).toEqual([
        {
          teamId: theirs,
          played: 3,
          wins: 2,
          draws: 0,
          losses: 1,
          lastResult: "won",
          lastPlayedAt: new Date(FIRST.getTime() + 2 * DAY),
        },
      ]);
      expect(oursRivals.closest).toBeNull();

      const theirsRivals = await loadTeamRivals(db, theirs);
      expect(theirsRivals.rivals).toMatchObject([
        { teamId: ours, played: 3, wins: 1, draws: 0, losses: 2 },
      ]);
      expect(theirsRivals.rivals[0]!.lastResult).toBe("lost");

      expect(await loadTeamRecord(db, ours)).toEqual({
        gamesPlayed: 3,
        wins: 2,
        draws: 0,
        losses: 1,
      });
      expect(await loadTeamForm(db, ours)).toEqual(["won", "lost", "won"]);
    });
  });

  it("counts a football draw in draws only", async () => {
    await withDb(async (database, db) => {
      const base = await setup(database, "football");
      const [ours, theirs] = base.teamIds;
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: [{ slot1GamesWon: 2, slot2GamesWon: 2 }],
        day: 0,
      });
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: [{ slot1GamesWon: 3, slot2GamesWon: 1 }],
        day: 1,
      });
      expect(await loadTeamRecord(db, ours)).toEqual({
        gamesPlayed: 2,
        wins: 1,
        draws: 1,
        losses: 0,
      });
      expect((await loadTeamRivals(db, theirs)).rivals).toMatchObject([
        { teamId: ours, played: 2, wins: 0, draws: 1, losses: 1 },
      ]);
      expect(await loadTeamForm(db, theirs)).toEqual(["draw", "lost"]);
    });
  });

  it("counts a cancelled Game's Match and an unconfirmed Match nowhere", async () => {
    await withDb(async (database, db) => {
      const base = await setup(database, "padel");
      const [ours, theirs] = base.teamIds;
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: WIN,
        day: 0,
        cancelledGame: true,
      });
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: WIN,
        day: 1,
        status: MatchStatusEnum.PENDING,
      });
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: WIN,
        day: 2,
      });
      expect(await loadTeamRecord(db, ours)).toEqual({
        gamesPlayed: 1,
        wins: 1,
        draws: 0,
        losses: 0,
      });
      const { rivals, closest } = await loadTeamRivals(db, ours);
      expect(rivals).toEqual([]);
      expect(closest).toMatchObject({ teamId: theirs, played: 1, wins: 1 });
    });
  });

  it("shows a Team played once as the closest, not a Rival", async () => {
    await withDb(async (database, db) => {
      const base = await setup(database, "padel");
      const [ours, rival, once] = base.teamIds;
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: rival,
        sets: WIN,
        day: 0,
      });
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: rival,
        sets: LOSS,
        day: 1,
      });
      await playMatch(database, base, {
        slot1TeamId: once,
        slot2TeamId: ours,
        sets: WIN,
        day: 2,
      });
      const { rivals, closest } = await loadTeamRivals(db, ours);
      expect(rivals.map((entry) => entry.teamId)).toEqual([rival]);
      expect(closest).toMatchObject({
        teamId: once,
        played: 1,
        losses: 1,
        lastResult: "lost",
      });
    });
  });

  it("reads several Teams in one load, each from its own side", async () => {
    await withDb(async (database, db) => {
      const base = await setup(database, "padel");
      const [ours, theirs, idle] = base.teamIds;
      await playMatch(database, base, {
        slot1TeamId: ours,
        slot2TeamId: theirs,
        sets: WIN,
        day: 0,
      });
      const byTeam = await loadTeamMatches(db, [ours, theirs, idle]);
      expect(byTeam.get(ours)).toMatchObject([
        {
          opponentTeamId: theirs,
          venueName: "Seef Courts",
          sets: [{ us: 6, them: 2 }],
          result: "won",
        },
      ]);
      expect(byTeam.get(theirs)).toMatchObject([
        { opponentTeamId: ours, sets: [{ us: 2, them: 6 }], result: "lost" },
      ]);
      expect(byTeam.get(idle)).toEqual([]);
    });
  });
});

describe("teamFormFromMatches", () => {
  it("keeps the last ten scored results, newest last", () => {
    const results = Array.from({ length: 12 }, (_, index) => ({
      result: index % 2 === 0 ? ("won" as const) : ("lost" as const),
    }));
    const form = teamFormFromMatches([...results, { result: null }]);
    expect(form).toHaveLength(10);
    expect(form.at(-1)).toBe("lost");
    expect(form[0]).toBe("won");
  });
});

describe("teamRivalsFromMatches", () => {
  it("ranks Rivals by Matches played, then by the latest", () => {
    const at = (day: number) => new Date(FIRST.getTime() + day * DAY);
    const { rivals } = teamRivalsFromMatches([
      { opponentTeamId: "a", playedAt: at(0), result: "won" },
      { opponentTeamId: "a", playedAt: at(1), result: "won" },
      { opponentTeamId: "b", playedAt: at(2), result: "lost" },
      { opponentTeamId: "b", playedAt: at(3), result: "lost" },
      { opponentTeamId: "c", playedAt: at(4), result: "draw" },
      { opponentTeamId: "c", playedAt: at(5), result: "draw" },
      { opponentTeamId: "c", playedAt: at(6), result: null },
      { opponentTeamId: null, playedAt: at(7), result: "won" },
    ]);
    expect(rivals.map((entry) => entry.teamId)).toEqual(["c", "b", "a"]);
    expect(rivals[0]).toMatchObject({ played: 3, draws: 2, lastResult: null });
  });
});
