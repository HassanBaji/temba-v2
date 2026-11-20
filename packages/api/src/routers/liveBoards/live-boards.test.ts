import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Db } from "@repo/db";
import {
  courts,
  games,
  groupMembers,
  groups,
  liveBoards,
  matches,
  matchSets,
  ratings,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { socialBoardView } from "@repo/domain/live-board";

import {
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { createFriendlyGame } from "#src/games/create-friendly";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { generateRounds } from "#src/routers/games/generateRounds";
import { markMatchNotFinished } from "#src/routers/games/markMatchNotFinished";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { postRounds } from "#src/routers/games/postRounds";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { connectLiveBoardTv } from "#src/routers/liveBoards/connect";
import { disconnectLiveBoardTv } from "#src/routers/liveBoards/disconnectTv";
import { liveBoardForGame } from "#src/routers/liveBoards/forGame";
import { setLiveBoardMessage } from "#src/routers/liveBoards/setMessage";
import { setLiveBoardRoundClock } from "#src/routers/liveBoards/setRoundClock";
import { liveBoardSnapshot } from "#src/routers/liveBoards/snapshot";
import { startLiveBoard } from "#src/routers/liveBoards/start";
import { stopLiveBoard } from "#src/routers/liveBoards/stop";
import { updateLiveBoard } from "#src/routers/liveBoards/update";

const ORIGIN = "https://temba.app";
const WINDOW_START = new Date("2026-11-08T07:00:00.000Z");
const WINDOW_END = new Date("2026-11-08T12:00:00.000Z");
const NOW = new Date("2026-11-08T07:05:00.000Z");
const MINUTE = 60_000;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  courtNames: string[],
  name = "World Padel Academy",
) {
  const [venue] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const courtRows = await database
    .insert(courts)
    .values(courtNames.map((name) => ({ venueId: venue.id, name })))
    .returning({ id: courts.id });
  return { venueId: venue.id, courtIds: courtRows.map((court) => court.id) };
}

async function insertGroup(database: TestDatabase, ownerId: string) {
  const [group] = await database
    .insert(groups)
    .values({
      verifiedAt: new Date(),
      name: "Tuesday Night Padel",
      createdBy: ownerId,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: ownerId });
  return group.id;
}

const TEAM_NAMES = [
  ["Layla Abbas", "Nora Bader"],
  ["Sara Chahine", "Mariam Darwish"],
  ["Rashed Ebrahim", "Yousif Fakhro"],
  ["Omar Ghanem", "Jassim Hassan"],
] as const;

/** A Rounds-shaped Social of four pairs on two Courts, draw posted, no Round made. */
async function seedSocial(database: TestDatabase, venueName?: string) {
  const owner = await insertUser(database, "Hassan Haji");
  const { venueId, courtIds } = await insertVenue(
    database,
    ["Court 1", "Court 2"],
    venueName,
  );
  const groupId = await insertGroup(database, owner.id);
  const created = await createTournament(database as unknown as Db, {
    createdBy: owner.id,
    name: "Sunday Social",
    groupId,
    isPublic: false,
    registrationMode: "individual",
    teamCount: 4,
    poolCount: 1,
    venueId,
    courtIds,
    matchMinutes: 30,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  const players = [];
  for (const [team, names] of TEAM_NAMES.entries()) {
    for (const [index, position] of (["left", "right"] as const).entries()) {
      const player = await insertUser(database, names[index]!);
      await database
        .insert(groupMembers)
        .values({ groupId, userId: player.id });
      await registerSeat(database as unknown as Db, {
        gameId: created.id,
        userId: player.id,
        sideIndex: team + 1,
        position,
      });
      players.push(player);
    }
  }
  await drawPools(database as unknown as Db, {
    gameId: created.id,
    organizerUserId: owner.id,
    shuffle: (items) => [...items],
  });
  await postPoolDraw(database as unknown as Db, {
    gameId: created.id,
    organizerUserId: owner.id,
    rounds: "later",
  });
  return { owner, players, gameId: created.id };
}

async function postEveryRound(
  database: TestDatabase,
  seeded: { gameId: string; owner: { id: string } },
) {
  const generated = await generateRounds(database as unknown as Db, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
    scope: "all",
    random: () => 0,
  });
  await postRounds(database as unknown as Db, {
    gameId: seeded.gameId,
    organizerUserId: seeded.owner.id,
    roundNumbers: generated.roundNumbers,
  });
}

async function startAndConnect(
  database: TestDatabase,
  seeded: { gameId: string; owner: { id: string } },
  now = NOW,
) {
  const control = await startLiveBoard(database as unknown as Db, {
    gameId: seeded.gameId,
    userId: seeded.owner.id,
    origin: ORIGIN,
    now,
  });
  const { token } = await connectLiveBoardTv(database as unknown as Db, {
    code: control.code,
    now,
  });
  return { control, token };
}

async function liveSnapshot(database: TestDatabase, token: string, now = NOW) {
  const snapshot = await liveBoardSnapshot(database as unknown as Db, {
    token,
    origin: ORIGIN,
    now,
  });
  if (snapshot.status !== "live") {
    throw new Error(`Expected a live board, got ${snapshot.status}`);
  }
  return snapshot;
}

describe("Show on TV", () => {
  it("mints a six-digit Board code for the Organizer and gives it back on a second start", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const first = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      expect(first.code).toMatch(/^\d{6}$/);
      expect(first.url).toBe(`${ORIGIN}/tv/${first.code}`);
      expect(first.address).toBe("temba.app/tv");
      expect(first).toMatchObject({
        rotate: true,
        rotateSeconds: 10,
        colorScheme: "dark",
        showQr: true,
        tvs: [],
      });

      const second = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      expect(second.id).toBe(first.id);
      expect(await database.query.liveBoards.findMany()).toHaveLength(1);
    });
  });

  it("is the Organizer's alone", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const player = seeded.players[0]!;
      await expect(
        startLiveBoard(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: player.id,
          origin: ORIGIN,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      expect(
        await liveBoardForGame(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: player.id,
          origin: ORIGIN,
        }),
      ).toEqual({
        gameName: "Sunday Social",
        kind: "social",
        canStart: false,
        board: null,
      });
      const stranger = await insertUser(database, "Stranger");
      await expect(
        liveBoardForGame(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: stranger.id,
          origin: ORIGIN,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("draws another code when the first is on a running board", async () => {
    await withDb(async (database) => {
      const one = await seedSocial(database);
      const two = await seedSocial(database, "Padel Point");
      const codes = ["111111", "111111", "222222"];
      const createCode = () => codes.shift() ?? "999999";
      const first = await startLiveBoard(database as unknown as Db, {
        gameId: one.gameId,
        userId: one.owner.id,
        origin: ORIGIN,
        createCode,
      });
      const second = await startLiveBoard(database as unknown as Db, {
        gameId: two.gameId,
        userId: two.owner.id,
        origin: ORIGIN,
        createCode,
      });
      expect([first.code, second.code]).toEqual(["111111", "222222"]);
    });
  });

  it("has no board for a Knockout or a cancelled Game, and none once the window is six hours gone", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const start = (now = NOW) =>
        startLiveBoard(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
          origin: ORIGIN,
          now,
        });
      await expect(
        start(new Date(WINDOW_END.getTime() + 6 * 60 * MINUTE)),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await database
        .update(games)
        .set({ tournamentShape: "groups_then_knockout" })
        .where(eq(games.id, seeded.gameId));
      await expect(start()).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await liveBoardForGame(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
          origin: ORIGIN,
        }),
      ).toEqual({
        gameName: "Sunday Social",
        kind: null,
        canStart: false,
        board: null,
      });

      await database
        .update(games)
        .set({ tournamentShape: "rounds", cancelledAt: NOW })
        .where(eq(games.id, seeded.gameId));
      await expect(start()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});

describe("a TV joining with the Board code", () => {
  it("connects however the code is typed and is listed for the Organizer", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const control = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      const spaced = `${control.code.slice(0, 3)} ${control.code.slice(3)}`;
      await connectLiveBoardTv(database as unknown as Db, {
        code: spaced,
        name: "  Clubhouse   TV ",
      });
      await connectLiveBoardTv(database as unknown as Db, {
        code: control.code,
        now: new Date(NOW.getTime() + 1000),
      });

      const state = await liveBoardForGame(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      expect(state.board?.tvs.map((tv) => tv.name)).toEqual([
        "Clubhouse TV",
        "TV 2",
      ]);
    });
  });

  it("reads a wrong code and a retired one as no board", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const control = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      const other = control.code === "000000" ? "000001" : "000000";
      for (const code of [other, "12345", "abcdef"]) {
        await expect(
          connectLiveBoardTv(database as unknown as Db, { code }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      }

      await stopLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });
      await expect(
        connectLiveBoardTv(database as unknown as Db, { code: control.code }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("drops a TV from the list once it stops asking for the board", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { token } = await startAndConnect(database, seeded);
      const listed = async (now: Date) =>
        (
          await liveBoardForGame(database as unknown as Db, {
            gameId: seeded.gameId,
            userId: seeded.owner.id,
            origin: ORIGIN,
            now,
          })
        ).board?.tvs.length;

      const later = new Date(NOW.getTime() + 40_000);
      await liveSnapshot(database, token, later);
      expect(await listed(new Date(later.getTime() + 40_000))).toBe(1);
      expect(await listed(new Date(later.getTime() + 50_000))).toBe(0);
    });
  });
});

/** A TV's token lasts 45 quiet seconds, so a read minutes later joins afresh. */
async function snapshotAt(database: TestDatabase, code: string, now: Date) {
  const { token } = await connectLiveBoardTv(database as unknown as Db, {
    code,
    now,
  });
  return liveSnapshot(database, token, now);
}

describe("a Social's board", () => {
  const jobs = recordJobs();

  it("waits until a Round is posted", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { token } = await startAndConnect(database, seeded);
      const snapshot = await liveSnapshot(database, token);
      expect(snapshot.game).toMatchObject({
        name: "Sunday Social",
        groupName: "Tuesday Night Padel",
        venueName: "World Padel Academy",
        followUrl: `${ORIGIN}/dashboard/games/${seeded.gameId}`,
      });
      expect(snapshot.content).toMatchObject({
        kind: "social",
        ranks: "teams",
        roundCount: 3,
        matchMinutes: 30,
        finished: false,
      });
      if (snapshot.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(snapshot.content.rounds.map((round) => round.state)).toEqual([
        "not_made",
        "not_made",
        "not_made",
      ]);
      expect(snapshot.content.rounds.every((round) => round.startTime)).toBe(
        true,
      );
    });
  });

  it("shows a saved score on its Court at once and moves the table only when the Round is finished", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await postEveryRound(database, seeded);
      const { token } = await startAndConnect(database, seeded);

      const before = await liveSnapshot(database, token);
      if (before.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      const [roundOne, roundTwo] = before.content.rounds;
      expect(roundOne?.state).toBe("on_court");
      expect(roundTwo?.state).toBe("scheduled");
      expect(roundOne?.matches.map((match) => match.courtName)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      expect(roundOne?.matches.map((match) => match.state)).toEqual([
        "on_court",
        "on_court",
      ]);
      const onCourtOne = roundOne!.matches[0]!;
      expect(onCourtOne.side1.players).toHaveLength(2);
      expect(onCourtOne.score1).toBeNull();

      const scorer = seeded.players.find(
        (player) => player.name === onCourtOne.side1.players[0],
      )!;
      await enterTournamentScore(database as unknown as Db, {
        gameId: seeded.gameId,
        matchId: onCourtOne.id,
        userId: scorer.id,
        slot1GamesWon: 4,
        slot2GamesWon: 3,
      });
      const saved = await liveSnapshot(database, token);
      if (saved.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(saved.content.rounds[0]?.matches[0]).toMatchObject({
        state: "awaiting_confirmation",
        score1: 4,
        score2: 3,
      });
      expect(
        saved.content.tables[0]?.rows.every((row) => row.played === 0),
      ).toBe(true);

      await enterTournamentScore(database as unknown as Db, {
        gameId: seeded.gameId,
        matchId: onCourtOne.id,
        userId: seeded.owner.id,
        slot1GamesWon: 5,
        slot2GamesWon: 2,
      });
      const courtOneFinal = await liveSnapshot(database, token);
      if (courtOneFinal.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(courtOneFinal.content.rounds[0]?.matches[0]?.state).toBe(
        "confirmed",
      );
      expect(courtOneFinal.content.rounds[0]?.state).toBe("on_court");
      expect(
        courtOneFinal.content.tables[0]?.rows.every((row) => row.played === 0),
      ).toBe(true);

      await enterTournamentScore(database as unknown as Db, {
        gameId: seeded.gameId,
        matchId: roundOne!.matches[1]!.id,
        userId: seeded.owner.id,
        slot1GamesWon: 3,
        slot2GamesWon: 3,
      });
      const final = await liveSnapshot(database, token);
      if (final.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(final.content.rounds[0]?.state).toBe("played");
      const table = final.content.tables[0]!;
      expect(table.poolIndex).toBeNull();
      expect(table.rows[0]).toMatchObject({
        id: onCourtOne.side1.id,
        players: onCourtOne.side1.players,
        place: 1,
        played: 1,
        won: 1,
        points: 3,
        gamesFor: 5,
        gamesAgainst: 2,
        difference: 3,
        rounds: ["won", "none", "none"],
      });
      const loser = table.rows.find((row) => row.id === onCourtOne.side2.id);
      expect(loser).toMatchObject({
        lost: 1,
        points: 0,
        gamesFor: 2,
        gamesAgainst: 5,
        rounds: ["lost", "none", "none"],
      });
      expect(jobs).toBeDefined();
    });
  });

  it("ends on the final table once every Match is settled", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await postEveryRound(database, seeded);
      const { token } = await startAndConnect(database, seeded);
      const rows = await database.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      for (const row of rows) {
        await enterTournamentScore(database as unknown as Db, {
          gameId: seeded.gameId,
          matchId: row.id,
          userId: seeded.owner.id,
          slot1GamesWon: 6,
          slot2GamesWon: 2,
        });
      }
      const snapshot = await liveSnapshot(database, token);
      if (snapshot.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(snapshot.content.finished).toBe(true);
      expect(snapshot.content.finishedAt).toBeInstanceOf(Date);
      expect(snapshot.content.rounds.map((round) => round.state)).toEqual([
        "played",
        "played",
        "played",
      ]);
      expect(snapshot.content.tables[0]?.rows.map((row) => row.place)).toEqual([
        1, 2, 3, 4,
      ]);
    });
  });

  it("ends on the final table when the last Match did not finish", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await postEveryRound(database, seeded);
      const { token } = await startAndConnect(database, seeded);
      const [last, ...rest] = await database.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
        orderBy: (table, { desc }) => [desc(table.roundNumber)],
      });
      for (const row of rest) {
        await enterTournamentScore(database as unknown as Db, {
          gameId: seeded.gameId,
          matchId: row.id,
          userId: seeded.owner.id,
          slot1GamesWon: 6,
          slot2GamesWon: 2,
        });
      }
      await markMatchNotFinished(database as unknown as Db, {
        gameId: seeded.gameId,
        matchId: last!.id,
        userId: seeded.owner.id,
      });
      const snapshot = await liveSnapshot(database, token);
      expect(snapshot.content).toMatchObject({
        kind: "social",
        finished: true,
      });
    });
  });

  it("ranks an Americano's players on games won", async () => {
    await withDb(async (database) => {
      const organizer = await insertAmericanoUser(database, "Organizer Haji");
      const players = await insertAmericanoPlayers(database, 8);
      const gameId = await insertAmericano(database, {
        createdBy: organizer.id,
        players: 8,
        rounds: 3,
        windowStart: WINDOW_START,
        windowEnd: WINDOW_END,
      });
      const gamePlayerIds = await registerAmericanoPlayers(
        database,
        gameId,
        players,
      );
      const seeded = { gameId, owner: organizer };

      const { token } = await startAndConnect(database, seeded);
      const waiting = await liveSnapshot(database, token);
      expect(waiting.content).toMatchObject({
        kind: "social",
        ranks: "players",
        rounds: [],
        tables: [],
      });

      await postAmericanoRounds(asDb(database), {
        gameId,
        organizerUserId: organizer.id,
        gamePlayerIds,
      });
      const roundOne = (
        await database.query.matches.findMany({
          where: eq(matches.gameId, gameId),
          orderBy: (table, { asc }) => [asc(table.id)],
        })
      ).filter((row) => row.roundNumber === 1);
      await enterTournamentScore(asDb(database), {
        gameId,
        matchId: roundOne[0]!.id,
        userId: organizer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 1,
      });
      const half = await liveSnapshot(database, token);
      if (half.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(
        half.content.tables[0]?.rows.every((row) => row.played === 0),
      ).toBe(true);
      await enterTournamentScore(asDb(database), {
        gameId,
        matchId: roundOne[1]!.id,
        userId: organizer.id,
        slot1GamesWon: 5,
        slot2GamesWon: 3,
      });

      const snapshot = await liveSnapshot(database, token);
      if (snapshot.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      expect(snapshot.content.rounds).toHaveLength(3);
      expect(snapshot.content.rounds[0]?.matches).toHaveLength(2);
      expect(
        snapshot.content.rounds[0]?.matches[0]?.side1.players,
      ).toHaveLength(2);
      const table = snapshot.content.tables[0]!;
      expect(table.rows).toHaveLength(8);
      expect(table.rows.every((row) => row.players.length === 1)).toBe(true);
      expect(table.rows.map((row) => row.points)).toEqual([
        6, 6, 5, 5, 3, 3, 1, 1,
      ]);
      expect(table.rows[0]?.rounds).toEqual(["won", "none", "none"]);
      expect(table.rows.at(-1)).toMatchObject({ gamesAgainst: 6, lost: 1 });
    });
  });
});

describe("a one-Match board", () => {
  it("shows a padel Friendly game's sides, Level bands and Sets as saved", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "Hassan Haji");
      const { venueId } = await insertVenue(database, ["Court 3"]);
      const groupId = await insertGroup(database, owner.id);
      const created = await createFriendlyGame(database, {
        createdBy: owner.id,
        groupId,
        venueId,
        windowStart: WINDOW_START,
        windowEnd: new Date(WINDOW_START.getTime() + 90 * MINUTE),
      });
      const names = ["Khalid Janahi", "Ahmed Buhazza", "Mariam Zayani"];
      const seats = [
        [owner, 1, "left"],
        [await insertUser(database, names[0]!), 1, "right"],
        [await insertUser(database, names[1]!), 2, "left"],
        [await insertUser(database, names[2]!), 2, "right"],
      ] as const;
      for (const [player, sideIndex, position] of seats) {
        if (player.id !== owner.id) {
          await database
            .insert(groupMembers)
            .values({ groupId, userId: player.id });
        }
        await registerSeat(database as unknown as Db, {
          gameId: created.game.id,
          userId: player.id,
          sideIndex,
          position,
        });
      }
      await database.insert(ratings).values({
        userId: owner.id,
        sport: "padel",
        mu: 1500,
        phi: 120,
        sigma: 0.06,
        levelBand: "C1",
      });

      const seeded = { gameId: created.game.id, owner };
      const { token } = await startAndConnect(database, seeded);
      const [firstSet] = await database.query.matchSets.findMany({
        where: eq(matchSets.matchId, created.matchId),
      });
      await scoreSet(database, {
        gameId: created.game.id,
        matchId: created.matchId,
        setId: firstSet!.id,
        userId: owner.id,
        slot1GamesWon: 4,
        slot2GamesWon: 3,
      });

      const snapshot = await liveSnapshot(database, token);
      expect(snapshot.content).toEqual({
        kind: "padel_match",
        sides: [
          [
            { name: "Hassan Haji", levelBand: "C+" },
            { name: "Khalid Janahi", levelBand: null },
          ],
          [
            { name: "Ahmed Buhazza", levelBand: null },
            { name: "Mariam Zayani", levelBand: null },
          ],
        ],
        sets: [{ score1: 4, score2: 3 }],
        completed: false,
        courtName: null,
        ratingScope: "temba",
      });

      const [seatedMatch] = await database.query.matches.findMany({
        where: eq(matches.gameId, created.game.id),
      });
      await database
        .update(matches)
        .set({
          slot1GameTeamId: seatedMatch!.slot2GameTeamId,
          slot2GameTeamId: seatedMatch!.slot1GameTeamId,
        })
        .where(eq(matches.id, created.matchId));
      const turned = await liveSnapshot(database, token);
      expect(turned.content).toMatchObject({
        sides: [
          [{ name: "Hassan Haji" }, {}],
          [{ name: "Ahmed Buhazza" }, {}],
        ],
        sets: [{ score1: 3, score2: 4 }],
      });

      await expect(
        updateLiveBoard(database as unknown as Db, {
          gameId: created.game.id,
          userId: owner.id,
          heldScreen: "table",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("shows a football Game's sides, Score and Scorers once the teams are published", async () => {
    await withDb(async (database) => {
      const owner = await insertUser(database, "Rashid Nasser");
      const [venue] = await database
        .insert(venues)
        .values({ name: "Karbabad Turf", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const [pitch] = await database
        .insert(courts)
        .values({ venueId: venue!.id, name: "Pitch 2", sport: "football" })
        .returning({ id: courts.id });
      const [group] = await database
        .insert(groups)
        .values({ name: "Karbabad FC", createdBy: owner.id, sport: "football" })
        .returning({ id: groups.id });
      await database
        .insert(groupMembers)
        .values({ groupId: group!.id, userId: owner.id });
      const created = await createGame(database, {
        createdBy: owner.id,
        groupId: group!.id,
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        venueId: venue!.id,
        courtId: pitch!.id,
        windowStart: WINDOW_START,
        windowEnd: new Date(WINDOW_START.getTime() + 60 * MINUTE),
      });
      const roles = [
        ["Ali Khalaf", { role: "outfield", position: "fwd" }],
        ["Hassan Abdulla", { role: "keeper", position: "def" }],
        ["Khalid Fardan", { role: "outfield", position: "fwd" }],
        ["Faisal Ahmed", { role: "keeper", position: "def" }],
      ] as const;
      const players = [];
      for (const [name, football] of roles) {
        const player = await insertUser(database, name);
        await database
          .insert(groupMembers)
          .values({ groupId: group!.id, userId: player.id });
        await register(database, {
          gameId: created.id,
          userId: player.id,
          football,
        });
        players.push(player);
      }
      const [ali, hassan, khalid, faisal] = players;
      const seeded = { gameId: created.id, owner };
      const { token } = await startAndConnect(database, seeded);

      const waiting = await liveSnapshot(database, token);
      expect(waiting.content).toMatchObject({
        kind: "football",
        sides: null,
        sideSize: 5,
        hasMvp: true,
        mvpName: null,
      });

      await publishFootballTeams(database, {
        gameId: created.id,
        userId: owner.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [ali!.id, hassan!.id],
        slot2: [khalid!.id, faisal!.id],
      });
      await saveFootballScore(
        database,
        {
          gameId: created.id,
          userId: ali!.id,
          slot1Goals: 3,
          slot2Goals: 2,
          scorers: [
            { userId: ali!.id, goals: 2 },
            { userId: khalid!.id, goals: 1 },
          ],
        },
        new Date(WINDOW_START.getTime() + 34 * MINUTE),
      );

      const snapshot = await liveSnapshot(database, token);
      expect(snapshot.content).toMatchObject({
        kind: "football",
        completed: false,
        courtName: "Pitch 2",
        sides: [
          {
            bib: "black",
            goals: 3,
            players: [
              { name: "Hassan Abdulla", role: "gk" },
              { name: "Ali Khalaf", role: "fwd" },
            ],
            scorers: [{ name: "Ali Khalaf", goals: 2 }],
          },
          {
            bib: "white",
            goals: 2,
            players: [
              { name: "Faisal Ahmed", role: "gk" },
              { name: "Khalid Fardan", role: "fwd" },
            ],
            scorers: [{ name: "Khalid Fardan", goals: 1 }],
          },
        ],
      });
    });
  });
});

describe("the board control", () => {
  const control = (database: TestDatabase, gameId: string, userId: string) =>
    liveBoardForGame(database as unknown as Db, {
      gameId,
      userId,
      origin: ORIGIN,
    });

  it("holds the board on the screen tapped, and rotates again from On court", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { token } = await startAndConnect(database, seeded);
      const args = { gameId: seeded.gameId, userId: seeded.owner.id };

      await updateLiveBoard(database as unknown as Db, {
        ...args,
        heldScreen: "next_up",
      });
      expect((await liveSnapshot(database, token)).settings).toMatchObject({
        rotate: false,
        heldScreen: "next_up",
      });

      const later = new Date(NOW.getTime() + 30_000);
      await updateLiveBoard(database as unknown as Db, {
        ...args,
        rotate: true,
        now: later,
      });
      expect(
        (await liveSnapshot(database, token, later)).settings,
      ).toMatchObject({ rotate: true, rotationStartedAt: later });
    });
  });

  it("tells the control what the TVs show: waiting, the screens with something to show, then the final table", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await startAndConnect(database, seeded);
      const status = async () =>
        (await control(database, seeded.gameId, seeded.owner.id)).board?.status;
      expect(await status()).toEqual({
        phase: "waiting",
        screens: [],
        round: null,
      });

      const generated = await generateRounds(database as unknown as Db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        scope: "all",
        random: () => 0,
      });
      await postRounds(database as unknown as Db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumbers: [1],
      });
      expect(await status()).toMatchObject({
        phase: "live",
        screens: ["on_court", "table"],
        round: { roundNumber: 1, lengthSeconds: 30 * 60 },
      });

      // Off at the third step: the TVs skip Next up, so the board holds On court.
      await updateLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        rotate: false,
        now: new Date(NOW.getTime() + 24_000),
      });
      expect(
        (await control(database, seeded.gameId, seeded.owner.id)).board,
      ).toMatchObject({ rotate: false, heldScreen: "on_court" });

      await postRounds(database as unknown as Db, {
        gameId: seeded.gameId,
        organizerUserId: seeded.owner.id,
        roundNumbers: generated.roundNumbers.slice(1),
      });
      expect(await status()).toMatchObject({
        phase: "live",
        screens: ["on_court", "table", "next_up"],
      });

      for (const row of await database.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      })) {
        await enterTournamentScore(database as unknown as Db, {
          gameId: seeded.gameId,
          matchId: row.id,
          userId: seeded.owner.id,
          slot1GamesWon: 6,
          slot2GamesWon: 2,
        });
      }
      expect((await status())?.phase).toBe("final");
    });
  });

  it("holds the screen on show when rotation is switched off", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await startAndConnect(database, seeded);
      await updateLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        rotate: false,
        now: new Date(NOW.getTime() + 14_000),
      });
      expect(
        (await control(database, seeded.gameId, seeded.owner.id)).board,
      ).toMatchObject({ rotate: false, heldScreen: "table" });
    });
  });

  it("changes the pace, the colour scheme and the QR, and refuses an odd pace", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { token } = await startAndConnect(database, seeded);
      const args = { gameId: seeded.gameId, userId: seeded.owner.id };
      await updateLiveBoard(database as unknown as Db, {
        ...args,
        rotateSeconds: 20,
        colorScheme: "light",
        showQr: false,
      });
      expect((await liveSnapshot(database, token)).settings).toMatchObject({
        rotateSeconds: 20,
        colorScheme: "light",
        showQr: false,
      });
      await expect(
        updateLiveBoard(database as unknown as Db, {
          ...args,
          rotateSeconds: 7,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        updateLiveBoard(database as unknown as Db, {
          ...args,
          userId: seeded.players[0]!.id,
          colorScheme: "dark",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("lets the Organizer start, pause and resume the Round clock, and hand it back to the schedule", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await postEveryRound(database, seeded);
      const { code } = (await startAndConnect(database, seeded)).control;
      const at = (minutes: number) =>
        new Date(WINDOW_START.getTime() + minutes * MINUTE);
      const tap = (
        action: Parameters<typeof setLiveBoardRoundClock>[1]["action"],
        now: Date,
      ) =>
        setLiveBoardRoundClock(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
          action,
          roundNumber: 1,
          now,
        });
      const onTv = async (now: Date) => {
        const snapshot = await snapshotAt(database, code, now);
        if (snapshot.content.kind !== "social") {
          throw new Error("Expected a Social");
        }
        const view = socialBoardView(
          snapshot.content,
          now,
          snapshot.settings.roundClock,
        );
        return { state: view.current?.state, clock: view.clock };
      };

      expect(await onTv(at(5))).toEqual({
        state: "on_court",
        clock: { kind: "left", seconds: 25 * 60 },
      });

      await tap("start", at(12));
      expect(await onTv(at(14))).toEqual({
        state: "on_court",
        clock: { kind: "left", seconds: 28 * 60 },
      });

      await tap("pause", at(20));
      await tap("pause", at(21));
      expect(await onTv(at(30))).toEqual({
        state: "on_court",
        clock: { kind: "paused", seconds: 22 * 60 },
      });

      await tap("resume", at(30));
      expect(await onTv(at(35))).toEqual({
        state: "on_court",
        clock: { kind: "left", seconds: 17 * 60 },
      });
      expect(
        (await control(database, seeded.gameId, seeded.owner.id)).board
          ?.roundClock,
      ).toMatchObject({ byHand: true, roundNumber: 1, startedAt: at(12) });

      // No Match time moved: the clock is the board's alone.
      const starts = await database.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
        columns: { startTime: true, roundNumber: true },
      });
      expect(
        starts
          .filter((row) => row.roundNumber === 1)
          .every((row) => row.startTime?.getTime() === at(0).getTime()),
      ).toBe(true);

      await tap("schedule", at(36));
      expect(await onTv(at(36))).toEqual({
        state: "on_court",
        clock: { kind: "left", seconds: 0 },
      });
    });
  });

  it("makes each Round wait for Start once the Organizer runs the clock", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await postEveryRound(database, seeded);
      const { code } = (await startAndConnect(database, seeded)).control;
      const args = { gameId: seeded.gameId, userId: seeded.owner.id };
      await setLiveBoardRoundClock(database as unknown as Db, {
        ...args,
        action: "start",
        roundNumber: 1,
      });
      for (const row of await database.query.matches.findMany({
        where: and(
          eq(matches.gameId, seeded.gameId),
          eq(matches.roundNumber, 1),
        ),
      })) {
        await enterTournamentScore(database as unknown as Db, {
          ...args,
          matchId: row.id,
          slot1GamesWon: 6,
          slot2GamesWon: 3,
        });
      }

      const later = new Date(WINDOW_START.getTime() + 40 * MINUTE);
      const waiting = await snapshotAt(database, code, later);
      if (waiting.content.kind !== "social") {
        throw new Error("Expected a Social");
      }
      const view = socialBoardView(
        waiting.content,
        later,
        waiting.settings.roundClock,
      );
      expect(view.current).toMatchObject({
        roundNumber: 2,
        state: "scheduled",
      });
      expect(view.clock).toEqual({ kind: "ready", seconds: 30 * 60 });

      await expect(
        setLiveBoardRoundClock(database as unknown as Db, {
          ...args,
          action: "start",
          roundNumber: 1,
          now: later,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await setLiveBoardRoundClock(database as unknown as Db, {
        ...args,
        action: "start",
        roundNumber: 2,
        now: later,
      });
      expect(
        (await snapshotAt(database, code, later)).settings.roundClock,
      ).toMatchObject({ roundNumber: 2, startedAt: later, elapsedMs: 0 });
    });
  });

  it("keeps the Round clock to the Organizer and to a Social with a Round posted", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      await startAndConnect(database, seeded);
      const tap = (userId: string) =>
        setLiveBoardRoundClock(database as unknown as Db, {
          gameId: seeded.gameId,
          userId,
          action: "start",
        });
      await expect(tap(seeded.players[0]!.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(tap(seeded.owner.id)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  it("keeps a message saved until it is shown, and sends it only while it is up", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { token } = await startAndConnect(database, seeded);
      const args = { gameId: seeded.gameId, userId: seeded.owner.id };
      const message = async () =>
        (await liveSnapshot(database, token)).settings.message;

      await expect(
        setLiveBoardMessage(database as unknown as Db, {
          ...args,
          shown: true,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await setLiveBoardMessage(database as unknown as Db, {
        ...args,
        message: "  Round 2 starts in 2 minutes.  ",
      });
      expect(await message()).toBeNull();
      expect(
        (await control(database, seeded.gameId, seeded.owner.id)).board,
      ).toMatchObject({
        message: "Round 2 starts in 2 minutes.",
        messageShown: false,
      });

      await setLiveBoardMessage(database as unknown as Db, {
        ...args,
        shown: true,
      });
      expect(await message()).toBe("Round 2 starts in 2 minutes.");

      await setLiveBoardMessage(database as unknown as Db, {
        ...args,
        message: "",
      });
      expect(await message()).toBeNull();
      await expect(
        setLiveBoardMessage(database as unknown as Db, {
          ...args,
          message: "x".repeat(81),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("disconnects one TV and leaves the other showing the board", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { control: started, token } = await startAndConnect(
        database,
        seeded,
      );
      const second = await connectLiveBoardTv(database as unknown as Db, {
        code: started.code,
        now: new Date(NOW.getTime() + 1000),
      });
      const [first] = (await control(database, seeded.gameId, seeded.owner.id))
        .board!.tvs;
      await disconnectLiveBoardTv(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        tvId: first!.id,
      });

      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token,
          origin: ORIGIN,
        }),
      ).toEqual({ status: "disconnected" });
      await liveSnapshot(database, second.token);
      await expect(
        disconnectLiveBoardTv(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
          tvId: first!.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("stops the board on every TV, retires the code and starts afresh next time", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { control: started, token } = await startAndConnect(
        database,
        seeded,
      );
      await stopLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
      });

      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token,
          origin: ORIGIN,
        }),
      ).toEqual({ status: "stopped" });
      expect(
        (await control(database, seeded.gameId, seeded.owner.id)).board,
      ).toBeNull();
      await expect(
        stopLiveBoard(database as unknown as Db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const again = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      expect(again.id).not.toBe(started.id);
      expect(again.tvs).toEqual([]);
      expect(await database.query.liveBoards.findMany()).toHaveLength(2);
    });
  });

  it("opens again with the same code when its Game's window is moved later", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const first = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      const closedAt = new Date(WINDOW_END.getTime() + 6 * 60 * MINUTE);
      await expect(
        connectLiveBoardTv(database as unknown as Db, {
          code: first.code,
          now: closedAt,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await database
        .update(games)
        .set({ windowEnd: new Date(closedAt.getTime() + 60 * MINUTE) })
        .where(eq(games.id, seeded.gameId));
      const again = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
        now: closedAt,
      });
      expect(again).toMatchObject({ id: first.id, code: first.code });
      await connectLiveBoardTv(database as unknown as Db, {
        code: first.code,
        now: closedAt,
      });
      expect(await database.query.liveBoards.findMany()).toHaveLength(1);
    });
  });

  it("closes on its own six hours after the window, and when the Game is cancelled", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const closedAt = new Date(WINDOW_END.getTime() + 6 * 60 * MINUTE);
      const { token } = await startAndConnect(
        database,
        seeded,
        new Date(closedAt.getTime() - 1000),
      );
      await liveSnapshot(database, token, new Date(closedAt.getTime() - 1));
      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token,
          origin: ORIGIN,
          now: closedAt,
        }),
      ).toEqual({ status: "closed" });

      await database
        .update(games)
        .set({ cancelledAt: NOW })
        .where(eq(games.id, seeded.gameId));
      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token,
          origin: ORIGIN,
          now: new Date(closedAt.getTime() - 1),
        }),
      ).toEqual({ status: "closed" });
    });
  });

  it("reads a token nobody was given as expired", async () => {
    await withDb(async (database) => {
      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token: "nobody-was-given-this-token",
          origin: ORIGIN,
        }),
      ).toEqual({ status: "expired" });
      expect(await database.query.liveBoardTvs.findMany()).toEqual([]);
    });
  });
});

describe("a TV that goes quiet", () => {
  it("loses its token after 45 seconds, so no hidden TV can keep reading", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const { control, token } = await startAndConnect(database, seeded);
      const quiet = new Date(NOW.getTime() + 46_000);
      expect(
        await liveBoardSnapshot(database as unknown as Db, {
          token,
          origin: ORIGIN,
          now: quiet,
        }),
      ).toEqual({ status: "expired" });
      expect(await database.query.liveBoardTvs.findMany()).toEqual([]);

      const again = await connectLiveBoardTv(database as unknown as Db, {
        code: control.code,
        now: quiet,
      });
      await liveSnapshot(database, again.token, quiet);
    });
  });

  it("holds eight TVs, and gives a quiet one's place to the next to join", async () => {
    await withDb(async (database) => {
      const seeded = await seedSocial(database);
      const control = await startLiveBoard(database as unknown as Db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        origin: ORIGIN,
      });
      const join = (now: Date) =>
        connectLiveBoardTv(database as unknown as Db, {
          code: control.code,
          now,
        });
      for (let index = 0; index < 8; index += 1) {
        await join(NOW);
      }
      await expect(join(NOW)).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      const later = new Date(NOW.getTime() + 46_000);
      await join(later);
      const rows = await database.query.liveBoardTvs.findMany();
      expect(rows.map((row) => row.name)).toEqual(["TV 1"]);
    });
  });
});
