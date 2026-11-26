import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

import {
  americanoSeats,
  gameCourts,
  gamePlayers,
  gameTeams,
  gameWaitlist,
  games,
  matches,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";
import { isAmericanoFixedPair } from "@repo/domain/tournament-americano";
import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import { tournamentFinishedView } from "@repo/domain/tournament-finished";
import {
  kickableTournamentOccupants,
  tournamentOrganizerView,
} from "@repo/domain/tournament-organizer";

import {
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { americanoMatchesOf } from "#src/games/americano-matches";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { addGuestPlayer } from "#src/routers/games/addGuestPlayer";
import { gameById } from "#src/routers/games/byId";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";
import { setAmericanoFixedPairs } from "#src/routers/games/setAmericanoFixedPairs";
import { register } from "#src/routers/games/register";
import { repeatedPartners } from "#src/routers/games/swapAmericanoPlayers";
import { registerSeat } from "#src/routers/games/registerSeat";
import { undoPoolDraw } from "#src/routers/games/undoPoolDraw";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T12:30:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

async function testDatabase() {
  const { db, close } = await createPgliteDb();
  onTestFinished(close);
  return db;
}

async function expectRefused(run: () => Promise<unknown>, message: RegExp) {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).message).toMatch(message);
}

describe("createTournament, americano", () => {
  it("stores the players, the Rounds and the game length, and is never rated", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players: 16,
      rounds: 7,
      windowStart: START,
      windowEnd: END,
    });
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game).toMatchObject({
      format: "friendly_tournament",
      tournamentShape: "americano",
      playersAllowed: 16,
      teamsAllowed: 8,
      poolCount: null,
      roundCount: 7,
      matchMinutes: 30,
      allowSoloRegister: true,
      rated: false,
      groupRated: false,
    });
  });

  it("refuses players outside fours from 8 to 24, and more Rounds than partners", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    await expectRefused(
      () =>
        insertAmericano(database, {
          createdBy: organizer.id,
          players: 10,
          rounds: 3,
          windowStart: START,
          windowEnd: END,
        }),
      /8 to 24 players/,
    );
    await expectRefused(
      () =>
        createTournament(asDb(database), {
          createdBy: organizer.id,
          name: "Sunday Social",
          groupId: crypto.randomUUID(),
          isPublic: false,
          tournamentShape: "americano",
          teamCount: 4,
          roundCount: 8,
          venueId: crypto.randomUUID(),
          matchMinutes: 30,
          windowStart: START,
          windowEnd: END,
        }),
      /1 to 7 rounds/,
    );
  });
});

describe("createTournament, americano Courts and window", () => {
  const draft = {
    name: "Sunday Social",
    groupId: crypto.randomUUID(),
    isPublic: false,
    tournamentShape: "americano" as const,
    teamCount: 8,
    roundCount: 7,
    venueId: crypto.randomUUID(),
    matchMinutes: 30,
    windowStart: START,
  };

  it("needs a recorded Court", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    await expectRefused(
      () =>
        createTournament(asDb(database), {
          ...draft,
          createdBy: organizer.id,
          windowEnd: END,
        }),
      /at least one Court/,
    );
  });

  it("needs a window long enough for the Rounds on the recorded Courts", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    await expectRefused(
      () =>
        createTournament(asDb(database), {
          ...draft,
          createdBy: organizer.id,
          courtIds: [crypto.randomUUID(), crypto.randomUUID()],
          windowEnd: END,
        }),
      /need until \d{1,2}:\d{2}/,
    );
  });
});

describe("register on an americano", () => {
  it("takes a seat alone, and the player after the last seat waits", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players: 8,
      rounds: 3,
      windowStart: START,
      windowEnd: END,
    });
    const players = await insertAmericanoPlayers(database, 9);
    await registerAmericanoPlayers(database, gameId, players.slice(0, 8));
    const ninth = await register(asDb(database), {
      gameId,
      userId: players[8]!.id,
    });
    expect(ninth).toEqual({ ok: true, waitlisted: true });
    const seated = await database.query.gamePlayers.findMany({
      where: eq(gamePlayers.gameId, gameId),
    });
    expect(seated).toHaveLength(8);
    await expectRefused(
      () =>
        registerSeat(asDb(database), {
          gameId,
          userId: organizer.id,
          sideIndex: 1,
          position: "left",
        }),
      /.+/,
    );
  });
});

describe("postAmericanoRounds", () => {
  async function fullAmericano(players = 16, rounds = 7) {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players,
      rounds,
      windowStart: START,
      windowEnd: END,
    });
    const people = await insertAmericanoPlayers(database, players);
    const gamePlayerIds = await registerAmericanoPlayers(
      database,
      gameId,
      people,
    );
    return { database, organizer, gameId, people, gamePlayerIds };
  }

  it("makes every Round from the order, four seats a Match, nobody with the same partner twice", async () => {
    const { database, organizer, gameId, gamePlayerIds } =
      await fullAmericano();
    const result = await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    expect(result).toEqual({ ok: true, roundCount: 7, matchCount: 28 });

    const rows = await database.query.matches.findMany({
      where: eq(matches.gameId, gameId),
      with: { americanoSeats: true },
    });
    expect(rows).toHaveLength(28);
    for (const row of rows) {
      expect(row.slot1GameTeamId).toBeNull();
      expect(row.americanoSeats.map((seat) => seat.slot).sort()).toEqual([
        1, 1, 2, 2,
      ]);
    }
    const pairings = rows.map((row) => {
      const side = (slot: number) =>
        row.americanoSeats
          .filter((seat) => seat.slot === slot)
          .map((seat) => seat.gamePlayerId);
      return {
        roundNumber: row.roundNumber ?? 0,
        slot1: side(1),
        slot2: side(2),
      };
    });
    expect(repeatedPartners(pairings)).toEqual([]);

    const firstRound = rows.filter((row) => row.roundNumber === 1);
    expect(
      new Set(firstRound.map((row) => row.startTime?.toISOString())).size,
    ).toBe(1);
    expect(new Set(firstRound.map((row) => row.courtId)).size).toBe(4);
    const lastRound = rows.filter((row) => row.roundNumber === 7);
    expect(lastRound[0]?.startTime).toEqual(new Date("2026-09-25T12:00:00"));

    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game?.drawPostedAt).not.toBeNull();
    expect(game?.registrationClosedAt).not.toBeNull();
  });

  it("empties the waitlist and closes the seats", async () => {
    const { database, organizer, gameId, gamePlayerIds } = await fullAmericano(
      8,
      3,
    );
    const late = await insertAmericanoUser(database, "Late Haji");
    await register(asDb(database), { gameId, userId: late.id });
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    const waiting = await database.query.gameWaitlist.findMany({
      where: eq(gameWaitlist.gameId, gameId),
    });
    expect(waiting).toEqual([]);
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          gamePlayerIds,
        }),
      /already made/,
    );
  });

  it("keeps the Rounds to one fewer than the players", async () => {
    const database = await testDatabase();
    const organizer = await insertAmericanoUser(database, "Hassan Haji");
    const gameId = await insertAmericano(database, {
      createdBy: organizer.id,
      players: 12,
      rounds: 11,
      windowStart: START,
      windowEnd: new Date("2026-09-25T23:00:00"),
    });
    const people = await insertAmericanoPlayers(database, 8);
    const gamePlayerIds = await registerAmericanoPlayers(
      database,
      gameId,
      people,
    );
    const result = await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    expect(result.roundCount).toBe(7);
    expect(result.matchCount).toBe(14);
  });

  it("refuses a field not in fours, a changed field and anyone but an Organizer", async () => {
    const { database, organizer, gameId, people, gamePlayerIds } =
      await fullAmericano(12, 3);
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: people[0]!.id,
          gamePlayerIds,
        }),
      /.+/,
    );
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          gamePlayerIds: gamePlayerIds.slice(1),
        }),
      /players changed/,
    );
    await leaveGame(asDb(database), { gameId, userId: people[0]!.id });
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          gamePlayerIds: gamePlayerIds.slice(1),
        }),
      /in fours/,
    );
  });

  it("refuses Rounds that would run past the end of the Social", async () => {
    const { database, organizer, gameId, gamePlayerIds } = await fullAmericano(
      8,
      3,
    );
    const recorded = await database.query.gameCourts.findMany({
      where: eq(gameCourts.gameId, gameId),
    });
    await database.delete(gameCourts).where(eq(gameCourts.id, recorded[0]!.id));
    await database
      .update(games)
      .set({ windowEnd: new Date("2026-09-25T10:30:00") })
      .where(eq(games.id, gameId));
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          gamePlayerIds,
        }),
      /run past the end/,
    );
  });

  it("lets an Organizer add a player alone before the Rounds, never after", async () => {
    const { database, organizer, gameId } = await fullAmericano(8, 3);
    await leaveGame(asDb(database), {
      gameId,
      userId: (await database.query.gamePlayers.findFirst({
        where: eq(gamePlayers.gameId, gameId),
      }))!.userId!,
    });
    await addGuestPlayer(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      name: "Guest Haji",
    });
    const links = await database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, gameId),
    });
    expect(links).toEqual([]);
    const gamePlayerIds = (
      await database.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, gameId),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      })
    ).map((row) => row.id);
    expect(gamePlayerIds).toHaveLength(8);
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    await expectRefused(
      () =>
        addGuestPlayer(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          name: "Late Haji",
        }),
      /.+/,
    );
  });

  it("leaves My Games once every Match is settled", async () => {
    const { database, organizer, gameId, people, gamePlayerIds } =
      await fullAmericano(8, 3);
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    const listed = async () =>
      (await listMyGamesHubRows(asDb(database), people[0]!.id)).some(
        (row) => row.id === gameId,
      );
    expect(await listed()).toBe(true);
    const rows = await database.query.matches.findMany({
      where: eq(matches.gameId, gameId),
    });
    for (const row of rows) {
      await enterTournamentScore(asDb(database), {
        gameId,
        matchId: row.id,
        userId: organizer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
    }
    expect(await listed()).toBe(false);
  });

  it("refuses the Pool draw doors", async () => {
    const { database, organizer, gameId } = await fullAmericano(8, 3);
    await expectRefused(
      () =>
        drawPools(asDb(database), { gameId, organizerUserId: organizer.id }),
      /Make rounds/,
    );
  });

  it("keeps every player in after the Rounds are made", async () => {
    const { database, organizer, gameId, people, gamePlayerIds } =
      await fullAmericano(8, 3);
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    await expectRefused(
      () => leaveGame(asDb(database), { gameId, userId: people[0]!.id }),
      /.+/,
    );
    await expectRefused(
      () =>
        kick(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          userId: people[0]!.id,
        }),
      /every round/,
    );
    const seats = await database.query.americanoSeats.findMany({
      where: eq(americanoSeats.gamePlayerId, gamePlayerIds[0]!),
    });
    expect(seats).toHaveLength(3);
  });

  it("undoes the Rounds until a score is in, and makes them again", async () => {
    const { database, organizer, gameId, people, gamePlayerIds } =
      await fullAmericano(8, 3);
    const make = (order: readonly string[]) =>
      postAmericanoRounds(asDb(database), {
        gameId,
        organizerUserId: organizer.id,
        gamePlayerIds: order,
      });
    const canUndo = async () =>
      (await gameById(asDb(database), { gameId, userId: organizer.id }))
        .canUndoDraw;
    await make(gamePlayerIds);
    expect(await canUndo()).toBe(true);
    await expectRefused(
      () =>
        undoPoolDraw(asDb(database), {
          gameId,
          organizerUserId: people[0]!.id,
        }),
      /.+/,
    );

    await undoPoolDraw(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
    });
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game?.drawPostedAt).toBeNull();
    expect(
      await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
      }),
    ).toEqual([]);
    expect(await database.query.americanoSeats.findMany()).toEqual([]);
    await expectRefused(
      () =>
        undoPoolDraw(asDb(database), { gameId, organizerUserId: organizer.id }),
      /not made yet/,
    );

    await make([...gamePlayerIds].reverse());
    const [first] = await database.query.matches.findMany({
      where: eq(matches.gameId, gameId),
    });
    await enterTournamentScore(asDb(database), {
      gameId,
      matchId: first!.id,
      userId: organizer.id,
      slot1GamesWon: 6,
      slot2GamesWon: 2,
    });
    expect(await canUndo()).toBe(false);
    await expectRefused(
      () =>
        undoPoolDraw(asDb(database), { gameId, organizerUserId: organizer.id }),
      /score is in/,
    );
  });

  it("keeps each fixed pair together in every Round, and everyone else rotates", async () => {
    const { database, organizer, gameId, gamePlayerIds } =
      await fullAmericano();
    const fixedPairs = [
      [gamePlayerIds[0]!, gamePlayerIds[5]!],
      [gamePlayerIds[2]!, gamePlayerIds[9]!],
    ] as const;
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: fixedPairs.map(([firstGamePlayerId, secondGamePlayerId]) => ({
        firstGamePlayerId,
        secondGamePlayerId,
      })),
    });
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds: [...gamePlayerIds].reverse(),
    });

    const pairings = americanoMatchesOf(
      await database.query.matches.findMany({
        where: eq(matches.gameId, gameId),
        with: { americanoSeats: true },
      }),
    );
    expect(pairings).toHaveLength(28);
    for (let roundNumber = 1; roundNumber <= 7; roundNumber += 1) {
      const sides = pairings
        .filter((pairing) => pairing.roundNumber === roundNumber)
        .flatMap((pairing) => [pairing.slot1, pairing.slot2]);
      for (const fixed of fixedPairs) {
        expect(sides.some((side) => isAmericanoFixedPair([fixed], side))).toBe(
          true,
        );
      }
    }
    const repeats = repeatedPartners(pairings);
    expect(repeats).toHaveLength(2);
    expect(
      repeats.every((side) => isAmericanoFixedPair(fixedPairs, side)),
    ).toBe(true);
  });

  it("refuses when the fixed pairs no longer leave a new partner every Round", async () => {
    const { database, organizer, gameId, gamePlayerIds } = await fullAmericano(
      8,
      5,
    );
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: [
        {
          firstGamePlayerId: gamePlayerIds[0]!,
          secondGamePlayerId: gamePlayerIds[1]!,
        },
      ],
    });
    await database
      .update(games)
      .set({ roundCount: 7 })
      .where(eq(games.id, gameId));
    await expectRefused(
      () =>
        postAmericanoRounds(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          gamePlayerIds,
        }),
      /leaves 6 players to rotate/,
    );
  });

  it("reads through byId with the players on the roster", async () => {
    const { database, organizer, gameId, gamePlayerIds } = await fullAmericano(
      8,
      3,
    );
    const before = await gameById(asDb(database), {
      gameId,
      userId: organizer.id,
    });
    expect(before.roster?.count).toBe(8);
    expect(before.tournamentShape).toBe("americano");
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    const after = await gameById(asDb(database), {
      gameId,
      userId: organizer.id,
    });
    expect(after.drawPostedAt).not.toBeNull();
    // The tournament screen reads these before it hands off to the Americano screen.
    for (const read of [before, after]) {
      const details = read as unknown as TournamentDetails;
      const home = tournamentHomeView(details, "en");
      expect(home.drawn).toBe(read === after);
      expect(() => tournamentFinishedView(details, "en")).not.toThrow();
      expect(() => tournamentStandingsView(details, "en")).not.toThrow();
      expect(() =>
        tournamentOrganizerView(details, {
          drawn: home.drawn,
          partnerRequired: home.partnerRequired,
        }),
      ).not.toThrow();
      expect(() => kickableTournamentOccupants(details)).not.toThrow();
    }
  });
});
