import { describe, expect, it } from "vitest";

import {
  americanoFinishSlot,
  americanoRoundOf,
  americanoRounds,
  americanoTable,
  clampAmericanoPlayers,
  clampAmericanoRounds,
  isAmericano,
  swapInOrder,
  type AmericanoPairing,
} from "./tournament-americano";

const players = (count: number) =>
  Array.from({ length: count }, (_, index) => `p${index + 1}`);

function partnerCounts(pairings: readonly AmericanoPairing[]) {
  const counts = new Map<string, number>();
  for (const pair of pairings.flatMap((pairing) => [
    pairing.slot1,
    pairing.slot2,
  ])) {
    const key = [...pair].sort().join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function opponentMeetings(pairings: ReturnType<typeof americanoRounds>) {
  const counts = new Map<string, number>();
  for (const pairing of pairings) {
    for (const left of pairing.slot1) {
      for (const right of pairing.slot2) {
        const key = [left, right].sort().join("|");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

describe("isAmericano", () => {
  it("is the americano shape of a Friendly tournament only", () => {
    expect(isAmericano("friendly_tournament", "americano")).toBe(true);
    expect(isAmericano("americano", null)).toBe(false);
    expect(isAmericano("friendly_tournament", "rounds")).toBe(false);
  });
});

describe("clampAmericanoPlayers and clampAmericanoRounds", () => {
  it("keeps players in fours from 8 to 24", () => {
    expect(clampAmericanoPlayers(3)).toBe(8);
    expect(clampAmericanoPlayers(17)).toBe(16);
    expect(clampAmericanoPlayers(40)).toBe(24);
  });

  it("starts on seven Rounds and stops at everyone with everyone", () => {
    expect(clampAmericanoRounds(null, 16)).toBe(7);
    expect(clampAmericanoRounds(null, 8)).toBe(7);
    expect(clampAmericanoRounds(20, 16)).toBe(15);
    expect(clampAmericanoRounds(0, 16)).toBe(1);
  });
});

describe("americanoRounds", () => {
  it("plays every player once a Round, four to a game", () => {
    const pairings = americanoRounds(players(16), 7);
    expect(pairings).toHaveLength(28);
    for (let round = 1; round <= 7; round += 1) {
      const inRound = americanoRoundOf(pairings, round);
      expect(inRound.map((pairing) => pairing.position)).toEqual([1, 2, 3, 4]);
      const seen = inRound.flatMap((pairing) => [
        ...pairing.slot1,
        ...pairing.slot2,
      ]);
      expect(new Set(seen).size).toBe(16);
    }
  });

  it("never gives anyone the same partner twice, up to everyone with everyone", () => {
    for (const count of [8, 12, 16, 20, 24]) {
      const pairings = americanoRounds(players(count), count - 1);
      expect(Math.max(...partnerCounts(pairings).values())).toBe(1);
    }
  });

  it("caps the Rounds at one fewer than the players", () => {
    const pairings = americanoRounds(players(8), 12);
    expect(Math.max(...pairings.map((pairing) => pairing.roundNumber))).toBe(7);
  });

  it("keeps repeat opponents few: nobody meets anyone three times in a morning", () => {
    const meetings = opponentMeetings(americanoRounds(players(16), 7));
    expect(Math.max(...meetings.values())).toBeLessThanOrEqual(2);
  });

  it("refuses a field that is not in fours", () => {
    expect(americanoRounds(players(10), 3)).toEqual([]);
  });

  it("moves a swapped pair of players in every Round", () => {
    const order = players(8);
    const swapped = americanoRounds(swapInOrder(order, "p1", "p2"), 3);
    const rename = (player: string) =>
      player === "p1" ? "p2" : player === "p2" ? "p1" : player;
    const renamed = americanoRounds(order, 3).map((pairing) => ({
      ...pairing,
      slot1: pairing.slot1.map(rename),
      slot2: pairing.slot2.map(rename),
    }));
    expect(swapped).toEqual(renamed);
  });
});

describe("americanoTable", () => {
  it("ranks players on games won, then difference, then wins", () => {
    const table = americanoTable(
      ["a", "b", "c", "d"],
      [
        {
          slot1: ["a", "b"],
          slot2: ["c", "d"],
          slot1GamesWon: 6,
          slot2GamesWon: 4,
        },
        {
          slot1: ["a", "c"],
          slot2: ["b", "d"],
          slot1GamesWon: 5,
          slot2GamesWon: 5,
        },
      ],
    );
    expect(
      table.map((row) => [row.playerId, row.gamesWon, row.difference]),
    ).toEqual([
      ["a", 11, 2],
      ["b", 11, 2],
      ["c", 9, -2],
      ["d", 9, -2],
    ]);
    expect(table[0]).toMatchObject({
      place: 1,
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
    });
    expect(table[3]).toMatchObject({ place: 4, won: 0, drawn: 1, lost: 1 });
  });

  it("lists players with no result at the bottom with zeros", () => {
    const table = americanoTable(["a", "b"], []);
    expect(table.map((row) => row.played)).toEqual([0, 0]);
  });
});

describe("americanoFinishSlot", () => {
  it("runs the Rounds back to back from the start", () => {
    expect(
      americanoFinishSlot("09:00", {
        players: 16,
        rounds: 7,
        matchMinutes: 30,
        recordedCourts: 4,
      }),
    ).toBe("12:30");
  });

  it("waits for Courts when fewer are recorded, and rounds up to the half hour", () => {
    expect(
      americanoFinishSlot("09:00", {
        players: 16,
        rounds: 3,
        matchMinutes: 20,
        recordedCourts: 2,
      }),
    ).toBe("11:00");
  });
});
