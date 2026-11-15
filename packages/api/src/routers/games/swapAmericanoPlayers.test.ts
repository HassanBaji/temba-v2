import { TRPCError } from "@trpc/server";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import {
  repeatedPartners,
  swapPlayersInRound,
} from "@repo/domain/tournament-americano";

import {
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { americanoBoard } from "#src/routers/games/americanoBoard";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";
import { swapAmericanoPlayers } from "#src/routers/games/swapAmericanoPlayers";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");

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

async function madeAmericano() {
  const { db: database, close } = await createPgliteDb();
  onTestFinished(close);
  const organizer = await insertAmericanoUser(database, "Hassan Haji");
  const gameId = await insertAmericano(database, {
    createdBy: organizer.id,
    players: 8,
    rounds: 3,
    windowStart: START,
    windowEnd: END,
  });
  const people = await insertAmericanoPlayers(database, 8);
  const gamePlayerIds = await registerAmericanoPlayers(
    database,
    gameId,
    people,
  );
  await postAmericanoRounds(asDb(database), {
    gameId,
    organizerUserId: organizer.id,
    gamePlayerIds,
  });
  const board = () =>
    americanoBoard(asDb(database), { gameId, userId: organizer.id });
  return { database, organizer, gameId, people, board };
}

type BoardRounds = Awaited<
  ReturnType<Awaited<ReturnType<typeof madeAmericano>>["board"]>
>["rounds"];

/** The first two players of a Round whose swap keeps every partner new. */
function allowedSwap(
  rounds: BoardRounds,
  roundNumber: number,
  sameCourt: boolean,
) {
  const pairings = rounds.flatMap((round) =>
    round.matches.map((match) => ({
      roundNumber: round.roundNumber,
      slot1: [match.slot1PlayerIds[0]!, match.slot1PlayerIds[1]!] as const,
      slot2: [match.slot2PlayerIds[0]!, match.slot2PlayerIds[1]!] as const,
    })),
  );
  const matches = rounds[roundNumber - 1]!.matches;
  for (const [index, match] of matches.entries()) {
    const others = sameCourt ? [match] : matches.slice(index + 1);
    for (const first of match.slot1PlayerIds) {
      for (const other of others) {
        for (const second of sameCourt
          ? other.slot2PlayerIds
          : [...other.slot1PlayerIds, ...other.slot2PlayerIds]) {
          const swapped = swapPlayersInRound(
            pairings,
            roundNumber,
            first,
            second,
          );
          if (repeatedPartners(swapped).length === 0) {
            return { first, second, from: match, to: other };
          }
        }
      }
    }
  }
  throw new Error("No allowed swap in this Round");
}

function partnerOf(
  match: { slot1PlayerIds: string[]; slot2PlayerIds: string[] },
  player: string,
) {
  const pair = match.slot1PlayerIds.includes(player)
    ? match.slot1PlayerIds
    : match.slot2PlayerIds;
  return pair.find((other) => other !== player)!;
}

describe("swapAmericanoPlayers", () => {
  it("swaps two players across courts in one Round only", async () => {
    const { database, organizer, gameId, board } = await madeAmericano();
    const before = await board();
    const { first, second } = allowedSwap(before.rounds, 2, false);
    await swapAmericanoPlayers(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      roundNumber: 2,
      firstGamePlayerId: first,
      secondGamePlayerId: second,
    });
    const after = await board();
    const courtOf = (rounds: BoardRounds, player: string) =>
      rounds[1]!.matches.findIndex(
        (match) =>
          match.slot1PlayerIds.includes(player) ||
          match.slot2PlayerIds.includes(player),
      );
    expect(courtOf(after.rounds, first)).toBe(courtOf(before.rounds, second));
    expect(courtOf(after.rounds, second)).toBe(courtOf(before.rounds, first));
    expect(after.rounds[0]).toEqual(before.rounds[0]);
    expect(after.rounds[2]).toEqual(before.rounds[2]);
  });

  it("refuses a swap that gives a player the same partner twice", async () => {
    const { database, organizer, gameId, board } = await madeAmericano();
    const rounds = (await board()).rounds;
    const roundOne = rounds[0]!.matches[0]!;
    const player = roundOne.slot1PlayerIds[0]!;
    const firstPartner = partnerOf(roundOne, player);
    const roundTwo = rounds[1]!.matches.find(
      (match) =>
        match.slot1PlayerIds.includes(player) ||
        match.slot2PlayerIds.includes(player),
    )!;
    const roundTwoPartner = partnerOf(roundTwo, player);
    await expectRefused(
      () =>
        swapAmericanoPlayers(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          roundNumber: 2,
          firstGamePlayerId: roundTwoPartner,
          secondGamePlayerId: firstPartner,
        }),
      /second time/,
    );
  });

  it("refuses a Round that has a score, and anyone but an Organizer", async () => {
    const { database, organizer, gameId, people, board } =
      await madeAmericano();
    const round = (await board()).rounds[0]!;
    const [a, b] = round.matches[0]!.slot1PlayerIds;
    await expectRefused(
      () =>
        swapAmericanoPlayers(asDb(database), {
          gameId,
          organizerUserId: people[0]!.id,
          roundNumber: 1,
          firstGamePlayerId: a!,
          secondGamePlayerId: b!,
        }),
      /.+/,
    );
    vi.setSystemTime(new Date("2026-09-25T09:10:00"));
    try {
      await enterTournamentScore(asDb(database), {
        gameId,
        matchId: round.matches[0]!.matchId,
        userId: organizer.id,
        slot1GamesWon: 4,
        slot2GamesWon: 4,
      });
    } finally {
      vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    }
    await expectRefused(
      () =>
        swapAmericanoPlayers(asDb(database), {
          gameId,
          organizerUserId: organizer.id,
          roundNumber: 1,
          firstGamePlayerId: a!,
          secondGamePlayerId: b!,
        }),
      /has a score/,
    );
  });

  it("swaps players between the pairs on one court", async () => {
    const { database, organizer, gameId, board } = await madeAmericano();
    const { first, second, from } = allowedSwap(
      (await board()).rounds,
      3,
      true,
    );
    await swapAmericanoPlayers(asDb(database), {
      gameId,
      organizerUserId: organizer.id,
      roundNumber: 3,
      firstGamePlayerId: first,
      secondGamePlayerId: second,
    });
    const after = (await board()).rounds[2]!.matches.find(
      (match) => match.matchId === from.matchId,
    )!;
    expect(after.slot2PlayerIds).toContain(first);
    expect(after.slot1PlayerIds).toContain(second);
  });
});
