import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  comparePoolRecords,
  sortPoolRecords,
  type PoolRecordOrderInput,
} from "./pool-table";

function record(
  partial: Partial<PoolRecordOrderInput> & { gameTeamId: string },
): PoolRecordOrderInput {
  return {
    played: 1,
    won: 0,
    setDifference: 0,
    gamesDifference: 0,
    poolOrder: 1,
    headToHead: {},
    ...partial,
  };
}

function ids(rows: PoolRecordOrderInput[]) {
  return rows.map((row) => row.gameTeamId);
}

describe("comparePoolRecords", () => {
  it("orders by most wins", () => {
    const lower = record({ gameTeamId: "a", won: 1, poolOrder: 1 });
    const higher = record({ gameTeamId: "b", won: 2, poolOrder: 2 });
    assert.ok(comparePoolRecords(higher, lower) < 0);
    assert.deepEqual(ids(sortPoolRecords([lower, higher])), ["b", "a"]);
  });

  it("breaks a wins tie with the head-to-head result", () => {
    const winner = record({
      gameTeamId: "a",
      won: 2,
      poolOrder: 2,
      headToHead: { b: 1 },
    });
    const loser = record({
      gameTeamId: "b",
      won: 2,
      poolOrder: 1,
      headToHead: { a: 0 },
    });
    assert.ok(comparePoolRecords(winner, loser) < 0);
    assert.deepEqual(ids(sortPoolRecords([loser, winner])), ["a", "b"]);
  });

  it("skips a drawn head-to-head and uses Set difference", () => {
    const betterSets = record({
      gameTeamId: "a",
      won: 1,
      setDifference: 3,
      gamesDifference: 0,
      poolOrder: 2,
      headToHead: { b: 0.5 },
    });
    const worseSets = record({
      gameTeamId: "b",
      won: 1,
      setDifference: 1,
      gamesDifference: 20,
      poolOrder: 1,
      headToHead: { a: 0.5 },
    });
    assert.ok(comparePoolRecords(betterSets, worseSets) < 0);
    assert.deepEqual(ids(sortPoolRecords([worseSets, betterSets])), ["a", "b"]);
  });

  it("skips an unplayed head-to-head and uses Set difference", () => {
    const betterSets = record({
      gameTeamId: "a",
      won: 1,
      setDifference: 2,
      poolOrder: 2,
    });
    const worseSets = record({
      gameTeamId: "b",
      won: 1,
      setDifference: -1,
      poolOrder: 1,
    });
    assert.deepEqual(ids(sortPoolRecords([worseSets, betterSets])), ["a", "b"]);
  });

  it("breaks a Set-difference tie with games difference", () => {
    const betterGames = record({
      gameTeamId: "a",
      won: 1,
      setDifference: 2,
      gamesDifference: 8,
      poolOrder: 2,
      headToHead: { b: 0.5 },
    });
    const worseGames = record({
      gameTeamId: "b",
      won: 1,
      setDifference: 2,
      gamesDifference: 3,
      poolOrder: 1,
      headToHead: { a: 0.5 },
    });
    assert.ok(comparePoolRecords(betterGames, worseGames) < 0);
    assert.deepEqual(ids(sortPoolRecords([worseGames, betterGames])), [
      "a",
      "b",
    ]);
  });

  it("uses Pool order as the stable fallback when every tiebreak is equal", () => {
    const earlier = record({
      gameTeamId: "a",
      won: 1,
      setDifference: 1,
      gamesDifference: 4,
      poolOrder: 1,
      headToHead: { b: 0.5 },
    });
    const later = record({
      gameTeamId: "b",
      won: 1,
      setDifference: 1,
      gamesDifference: 4,
      poolOrder: 2,
      headToHead: { a: 0.5 },
    });
    assert.ok(comparePoolRecords(earlier, later) < 0);
    assert.deepEqual(ids(sortPoolRecords([later, earlier])), ["a", "b"]);
  });

  it("sorts a Game team with no played Matches last, including behind a side that lost everything", () => {
    const lostEverything = record({
      gameTeamId: "played",
      played: 3,
      won: 0,
      setDifference: -6,
      gamesDifference: -18,
      poolOrder: 2,
    });
    const unplayed = record({
      gameTeamId: "unplayed",
      played: 0,
      won: 0,
      setDifference: 0,
      gamesDifference: 0,
      poolOrder: 1,
    });
    assert.ok(comparePoolRecords(unplayed, lostEverything) > 0);
    assert.deepEqual(ids(sortPoolRecords([unplayed, lostEverything])), [
      "played",
      "unplayed",
    ]);
  });

  it("orders two unplayed Game teams by Pool order", () => {
    const earlier = record({
      gameTeamId: "a",
      played: 0,
      poolOrder: 1,
    });
    const later = record({
      gameTeamId: "b",
      played: 0,
      poolOrder: 2,
    });
    assert.deepEqual(ids(sortPoolRecords([later, earlier])), ["a", "b"]);
  });
});
