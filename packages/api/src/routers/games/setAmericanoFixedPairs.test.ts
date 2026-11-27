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

import { americanoFixedPairs } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { americanoBoard } from "#src/routers/games/americanoBoard";
import { kick } from "#src/routers/games/kick";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";
import { setAmericanoFixedPairs } from "#src/routers/games/setAmericanoFixedPairs";
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

async function expectRefused(run: () => Promise<unknown>, message: RegExp) {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).message).toMatch(message);
}

async function fullAmericano(players = 16, rounds = 7) {
  const { db: database, close } = await createPgliteDb();
  onTestFinished(close);
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
  const board = () =>
    americanoBoard(asDb(database), { gameId, userId: organizer.id });
  return { database, organizer, gameId, people, gamePlayerIds, board };
}

function pair(ids: readonly string[], first: number, second: number) {
  return { firstGamePlayerId: ids[first]!, secondGamePlayerId: ids[second]! };
}

describe("setAmericanoFixedPairs", () => {
  it("replaces the pairs, and an empty list clears them", async () => {
    const { database, organizer, gameId, gamePlayerIds, board } =
      await fullAmericano();
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: [pair(gamePlayerIds, 0, 1), pair(gamePlayerIds, 2, 3)],
    });
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: [pair(gamePlayerIds, 4, 5)],
    });
    expect((await board()).fixedPairs).toEqual([
      [gamePlayerIds[4], gamePlayerIds[5]],
    ]);
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: [],
    });
    expect((await board()).fixedPairs).toEqual([]);
  });

  it("refuses more than two pairs, a player twice and a player not on the Social", async () => {
    const { database, organizer, gameId, gamePlayerIds } =
      await fullAmericano();
    const set = (
      pairs: Parameters<typeof setAmericanoFixedPairs>[1]["pairs"],
    ) =>
      setAmericanoFixedPairs(asDb(database), {
        gameId,
        organizerUserId: organizer.id,
        pairs,
      });
    await expectRefused(
      () =>
        set([
          pair(gamePlayerIds, 0, 1),
          pair(gamePlayerIds, 2, 3),
          pair(gamePlayerIds, 4, 5),
        ]),
      /up to 2 pairs/,
    );
    await expectRefused(
      () => set([pair(gamePlayerIds, 0, 1), pair(gamePlayerIds, 1, 2)]),
      /one fixed pair only/,
    );
    await expectRefused(
      () =>
        set([
          {
            firstGamePlayerId: gamePlayerIds[0]!,
            secondGamePlayerId: crypto.randomUUID(),
          },
        ]),
      /players changed/,
    );
  });

  it("refuses a pair that leaves too few players for a new partner every Round", async () => {
    const { database, organizer, gameId, gamePlayerIds } = await fullAmericano(
      8,
      7,
    );
    await expectRefused(
      () =>
        setAmericanoFixedPairs(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          pairs: [pair(gamePlayerIds, 0, 1)],
        }),
      /leaves 6 players to rotate/,
    );
  });

  it("refuses anyone but an Organizer, and closes once the Rounds are made", async () => {
    const { database, organizer, gameId, people, gamePlayerIds } =
      await fullAmericano();
    await expectRefused(
      () =>
        setAmericanoFixedPairs(asDb(database), {
          gameId,
          organizerUserId: people[0]!.id,
          pairs: [pair(gamePlayerIds, 0, 1)],
        }),
      /./,
    );
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    await expectRefused(
      () =>
        setAmericanoFixedPairs(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          pairs: [pair(gamePlayerIds, 0, 1)],
        }),
      /fixed pairs are set/,
    );
  });

  it("drops the pair when one of its players is taken off", async () => {
    const { database, organizer, gameId, people, gamePlayerIds, board } =
      await fullAmericano();
    await setAmericanoFixedPairs(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      pairs: [pair(gamePlayerIds, 0, 1)],
    });
    await kick(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      userId: people[0]!.id,
    });
    expect((await board()).fixedPairs).toEqual([]);
    const rows = await database.query.americanoFixedPairs.findMany({
      where: eq(americanoFixedPairs.gameId, gameId),
    });
    expect(rows).toEqual([]);
  });

  it("opens again when the Rounds are undone, with the pairs kept", async () => {
    const { database, organizer, gameId, gamePlayerIds, board } =
      await fullAmericano();
    const set = (first: number, second: number) =>
      setAmericanoFixedPairs(asDb(database), {
        gameId,
        organizerUserId: organizer.id,
        pairs: [pair(gamePlayerIds, first, second)],
      });
    await set(0, 1);
    await postAmericanoRounds(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      gamePlayerIds,
    });
    await undoPoolDraw(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
    });
    expect((await board()).fixedPairs).toEqual([
      [gamePlayerIds[0], gamePlayerIds[1]],
    ]);
    await set(2, 3);
    expect((await board()).fixedPairs).toEqual([
      [gamePlayerIds[2], gamePlayerIds[3]],
    ]);
  });
});
