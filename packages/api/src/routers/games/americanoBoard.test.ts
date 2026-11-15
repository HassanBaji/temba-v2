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
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { americanoBoard } from "#src/routers/games/americanoBoard";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

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
  const userOf = new Map(
    gamePlayerIds.map((gamePlayerId, index) => [
      gamePlayerId,
      people[index]!.id,
    ]),
  );
  return { database, organizer, gameId, people, gamePlayerIds, userOf };
}

describe("americanoBoard", () => {
  it("lists every Round with its pairs, and the players before any score", async () => {
    const { database, gameId, people } = await madeAmericano();
    const board = await americanoBoard(asDb(database), {
      gameId,
      userId: people[0]!.id,
    });
    expect(board.posted).toBe(true);
    expect(board.rounds.map((round) => round.matches.length)).toEqual([
      2, 2, 2,
    ]);
    expect(board.rounds.every((round) => round.state === "scheduled")).toBe(
      true,
    );
    expect(board.rounds[0]?.canSwap).toBe(false);
    expect(board.standings).toHaveLength(8);
    expect(board.standings.every((row) => row.played === 0)).toBe(true);
    const mine = board.rounds[0]!.matches.find(
      (match) => match.viewerSlot != null,
    );
    expect(mine).toBeDefined();
    expect(
      board.teams.find((team) => team.gameTeamId === mine!.slot1GameTeamId)
        ?.members,
    ).toHaveLength(2);
  });

  it("scores a game through the tournament doors: one pair enters, the other confirms, both players get the games", async () => {
    const { database, organizer, gameId, people, userOf } =
      await madeAmericano();
    vi.setSystemTime(new Date("2026-09-25T09:20:00"));
    try {
      const first = (
        await americanoBoard(asDb(database), {
          gameId,
          userId: organizer.id,
        })
      ).rounds[0]!.matches[0]!;
      expect(first.state).toBe("on_court");
      const enterer = userOf.get(first.slot1PlayerIds[0]!)!;
      const confirmer = userOf.get(first.slot2PlayerIds[0]!)!;
      const entered = await enterTournamentScore(asDb(database), {
        gameId,
        matchId: first.matchId,
        userId: enterer,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      expect(entered).toEqual({ ok: true, final: false });

      const pending = await americanoBoard(asDb(database), {
        gameId,
        userId: confirmer,
      });
      const waiting = pending.rounds[0]!.matches[0]!;
      expect(waiting.state).toBe("awaiting_confirmation");
      expect(waiting.canConfirm).toBe(true);
      expect(waiting.enteredBySlot).toBe(1);
      expect(pending.standings.every((row) => row.played === 0)).toBe(true);

      await confirmMatchResult(asDb(database), {
        gameId,
        matchId: first.matchId,
        userId: confirmer,
      });
      const board = await americanoBoard(asDb(database), {
        gameId,
        userId: people[0]!.id,
      });
      expect(board.rounds[0]!.matches[0]!.state).toBe("confirmed");
      const winners = board.standings.slice(0, 2);
      expect(winners.map((row) => row.playerId).sort()).toEqual(
        [...first.slot1PlayerIds].sort(),
      );
      expect(winners.every((row) => row.gamesWon === 6 && row.won === 1)).toBe(
        true,
      );
      const losers = board.standings.filter((row) =>
        first.slot2PlayerIds.includes(row.playerId),
      );
      expect(
        losers.every((row) => row.gamesWon === 4 && row.difference === -2),
      ).toBe(true);
      expect(board.rounds[0]!.canSwap).toBe(false);
    } finally {
      vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    }
  });

  it("lets an Organizer's score stand at once, and finishes once every game is in", async () => {
    const { database, organizer, gameId } = await madeAmericano();
    vi.setSystemTime(new Date("2026-09-25T11:30:00"));
    try {
      const board = await americanoBoard(asDb(database), {
        gameId,
        userId: organizer.id,
      });
      for (const round of board.rounds) {
        for (const match of round.matches) {
          const result = await enterTournamentScore(asDb(database), {
            gameId,
            matchId: match.matchId,
            userId: organizer.id,
            slot1GamesWon: 5,
            slot2GamesWon: 3,
          });
          expect(result.final).toBe(true);
        }
      }
      const done = await americanoBoard(asDb(database), {
        gameId,
        userId: organizer.id,
      });
      expect(done.finished).toBe(true);
      expect(done.standings.reduce((sum, row) => sum + row.played, 0)).toBe(24);
    } finally {
      vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    }
  });
});
