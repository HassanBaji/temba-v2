import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  expectedRoundMatchCount,
  generateRounds,
  pairKey,
  pairRound,
  poolPlaysRound,
  repairLaterDrafts,
  roundProblems,
  roundRepeats,
  seededRandom,
  swapPairing,
  type MadeRound,
  type RoundPairing,
} from "./tournament-pairing";

const EIGHT = ["A", "B", "C", "D", "E", "F", "G", "H"];
const ONE_POOL = [{ poolIndex: 0, gameTeamIds: EIGHT }];

function pair(slot1: string, slot2: string): RoundPairing {
  return { slot1GameTeamId: slot1, slot2GameTeamId: slot2 };
}

function teamsIn(pairings: readonly RoundPairing[]) {
  return pairings.flatMap((p) => [p.slot1GameTeamId, p.slot2GameTeamId]);
}

describe("poolPlaysRound", () => {
  it("lets a smaller Pool sit out the tail of each Pass", () => {
    assert.equal(poolPlaysRound(4, 3, 5), true);
    assert.equal(poolPlaysRound(4, 4, 5), false);
    assert.equal(poolPlaysRound(4, 6, 5), true);
  });

  it("counts the Matches a Round holds across Pools", () => {
    const pools = [
      { poolIndex: 0, gameTeamIds: ["A", "B", "C", "D", "E"] },
      { poolIndex: 1, gameTeamIds: ["F", "G", "H", "I"] },
    ];
    assert.equal(expectedRoundMatchCount(pools, 1, 5), 4);
    assert.equal(expectedRoundMatchCount(pools, 4, 5), 2);
  });
});

describe("generateRounds", () => {
  it("makes a full round robin when every Round is asked for at once", () => {
    const rounds = generateRounds({
      pools: ONE_POOL,
      suggested: 7,
      roundCount: 7,
      roundNumbers: [1, 2, 3, 4, 5, 6, 7],
      madeRounds: [],
      random: seededRandom("full"),
    });
    assert.equal(rounds.length, 7);
    assert.deepEqual(roundRepeats(rounds, 7), []);
    const keys = new Set(
      rounds.flatMap((round) =>
        round.pairings.map((p) =>
          pairKey(p.slot1GameTeamId, p.slot2GameTeamId),
        ),
      ),
    );
    assert.equal(keys.size, 28);
  });

  it("finishes the round robin around a hand-paired Round without repeats", () => {
    const handMade: MadeRound = {
      roundNumber: 1,
      pairings: [
        pair("A", "B"),
        pair("C", "D"),
        pair("E", "F"),
        pair("G", "H"),
      ],
    };
    const rounds = generateRounds({
      pools: ONE_POOL,
      suggested: 7,
      roundCount: 7,
      roundNumbers: [2, 3, 4, 5, 6, 7],
      madeRounds: [handMade],
      random: seededRandom("around"),
    });
    assert.deepEqual(
      rounds.map((round) => round.roundNumber),
      [2, 3, 4, 5, 6, 7],
    );
    for (const round of rounds) {
      assert.equal(new Set(teamsIn(round.pairings)).size, 8);
    }
    assert.equal(roundRepeats([handMade, ...rounds], 7).length <= 1, true);
  });
});

describe("pairRound", () => {
  it("never pairs two teams again while a fresh opponent is free", () => {
    const played: MadeRound[] = [
      {
        roundNumber: 1,
        pairings: [
          pair("A", "B"),
          pair("C", "D"),
          pair("E", "F"),
          pair("G", "H"),
        ],
      },
    ];
    for (let seed = 0; seed < 20; seed += 1) {
      const pairings = pairRound({
        pools: ONE_POOL,
        roundNumber: 2,
        suggested: 7,
        otherRounds: played,
        random: seededRandom(`seed-${seed}`),
      });
      assert.deepEqual(
        roundRepeats([...played, { roundNumber: 2, pairings }], 7),
        [],
      );
    }
  });

  it("pairs teams on similar points when points are given", () => {
    const pairings = pairRound({
      pools: [{ poolIndex: 0, gameTeamIds: ["A", "B", "C", "D"] }],
      roundNumber: 3,
      suggested: 3,
      otherRounds: [],
      points: { A: 6, B: 6, C: 0, D: 0 },
      random: seededRandom("points"),
    });
    const keys = pairings.map((p) =>
      pairKey(p.slot1GameTeamId, p.slot2GameTeamId),
    );
    assert.deepEqual(
      keys.sort(),
      [pairKey("A", "B"), pairKey("C", "D")].sort(),
    );
  });

  it("keeps fixed pairings and fills the rest", () => {
    const pairings = pairRound({
      pools: ONE_POOL,
      roundNumber: 1,
      suggested: 7,
      otherRounds: [],
      fixed: [pair("A", "H")],
      random: seededRandom("fill"),
    });
    assert.deepEqual(pairings[0], pair("A", "H"));
    assert.equal(pairings.length, 4);
    assert.equal(new Set(teamsIn(pairings)).size, 8);
  });

  it("sits out the team that has played most in an odd Pool", () => {
    const pairings = pairRound({
      pools: [{ poolIndex: 0, gameTeamIds: ["A", "B", "C"] }],
      roundNumber: 2,
      suggested: 3,
      otherRounds: [{ roundNumber: 1, pairings: [pair("A", "B")] }],
      random: seededRandom("bye"),
    });
    assert.equal(pairings.length, 1);
    assert.equal(teamsIn(pairings).includes("C"), true);
  });
});

describe("swapPairing", () => {
  it("gives the kept team the chosen opponent and their old opponent the chosen team's place", () => {
    const swapped = swapPairing([pair("A", "B"), pair("C", "D")], "A", "D");
    assert.deepEqual(swapped, [pair("A", "D"), pair("C", "B")]);
  });

  it("refuses a swap inside one Match", () => {
    assert.equal(swapPairing([pair("A", "B")], "A", "B"), null);
  });
});

describe("repairLaterDrafts", () => {
  it("re-pairs later drafts so a swap does not leave a repeat", () => {
    const pools = [{ poolIndex: 0, gameTeamIds: ["A", "B", "C", "D"] }];
    const rounds = [
      {
        roundNumber: 1,
        draft: true,
        pairings: [pair("A", "C"), pair("B", "D")],
      },
      {
        roundNumber: 2,
        draft: true,
        pairings: [pair("A", "C"), pair("B", "D")],
      },
      {
        roundNumber: 3,
        draft: true,
        pairings: [pair("A", "D"), pair("B", "C")],
      },
    ];
    const repaired = repairLaterDrafts({
      pools,
      suggested: 3,
      roundCount: 3,
      rounds,
      changedRound: 1,
      seed: "repair",
    });
    assert.deepEqual(repaired.repeats, []);
    assert.deepEqual(repaired.rounds[0], rounds[0]);
  });

  it("is the same for the same seed", () => {
    const pools = [{ poolIndex: 0, gameTeamIds: EIGHT }];
    const rounds = [1, 2, 3].map((roundNumber) => ({
      roundNumber,
      draft: true,
      pairings: [
        pair("A", "B"),
        pair("C", "D"),
        pair("E", "F"),
        pair("G", "H"),
      ],
    }));
    const args = {
      pools,
      suggested: 7,
      roundCount: 7,
      rounds,
      changedRound: 1,
      seed: "same",
    };
    assert.deepEqual(repairLaterDrafts(args), repairLaterDrafts(args));
  });
});

describe("roundProblems", () => {
  const pools = [
    { poolIndex: 0, gameTeamIds: ["A", "B", "C", "D"] },
    { poolIndex: 1, gameTeamIds: ["E", "F", "G", "H"] },
  ];

  it("refuses a pair across Pools and a team twice", () => {
    const problems = roundProblems({
      pools,
      roundNumber: 1,
      suggested: 3,
      pairings: [pair("A", "E"), pair("A", "B")],
      requireComplete: false,
    });
    assert.deepEqual(
      problems.map((problem) => problem.kind),
      ["pools_differ", "team_twice"],
    );
  });

  it("asks for every Match before a Round is posted", () => {
    const problems = roundProblems({
      pools,
      roundNumber: 1,
      suggested: 3,
      pairings: [pair("A", "B")],
      requireComplete: true,
    });
    assert.deepEqual(problems, [{ kind: "incomplete", made: 1, expected: 4 }]);
  });
});
