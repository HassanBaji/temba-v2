import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildKnockoutTree,
  buildPoolKnockoutTree,
  groupsThenKnockoutReviewValue,
  knockoutFedBy,
  knockoutFeeds,
  knockoutMatchCode,
  knockoutMatchRoundName,
  knockoutOnlyReviewValue,
  knockoutQualifierLabel,
  knockoutRoundName,
  knockoutStartWord,
  qualifiersConsequenceLine,
  type KnockoutEntry,
  type KnockoutTree,
  type PoolKnockoutTree,
} from "~/lib/tournament-knockout";
import {
  balancedPoolSizes,
  clampQualifiersPerPool,
  defaultQualifiersPerPool,
  poolCountOptions,
  qualifiersPerPoolRange,
  resolveQualifiersPerPool,
  TOURNAMENT_TEAM_COUNTS,
  validateQualifiersPerPool,
} from "~/lib/tournament-sizing";

function treeFor(entrantCount: number): KnockoutTree {
  const tree = buildKnockoutTree({ entrantCount });
  assert.ok(tree, `tree for ${entrantCount}`);
  return tree;
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

describe("buildKnockoutTree", () => {
  for (const entrantCount of TOURNAMENT_TEAM_COUNTS) {
    describe(`${entrantCount} entrants`, () => {
      const tree = treeFor(entrantCount);
      const size = nextPowerOfTwo(entrantCount);

      it("pads the tree to the next power of two and gives the padding as Byes", () => {
        assert.equal(tree.size, size);
        assert.equal(tree.byeCount, size - entrantCount);
        assert.equal(tree.roundCount, Math.log2(size));
      });

      it("has entrants minus one Matches", () => {
        assert.equal(tree.matchCount, entrantCount - 1);
        assert.equal(tree.matches.length, entrantCount - 1);
        assert.equal(
          tree.matchesPerRound.reduce((total, count) => total + count, 0),
          entrantCount - 1,
        );
      });

      it("places every entrant exactly once", () => {
        const entrants = tree.entries.map((entry) => entry.entrant);
        assert.deepEqual(
          entrants,
          Array.from({ length: entrantCount }, (_, index) => index + 1),
        );
        const places = new Set(
          tree.entries.map(
            (entry) => `${entry.round}:${entry.position}:${entry.slot}`,
          ),
        );
        assert.equal(places.size, entrantCount);
      });

      it("gives the Byes to the first entrants in drawn order", () => {
        const byes = tree.firstRound
          .filter((place) => place.kind === "bye")
          .map((place) => (place.kind === "bye" ? place.entrant : 0))
          .sort((left, right) => left - right);
        assert.deepEqual(
          byes,
          Array.from({ length: tree.byeCount }, (_, index) => index + 1),
        );
        for (const entry of tree.entries) {
          assert.equal(entry.round, entry.entrant <= tree.byeCount ? 2 : 1);
        }
      });

      it("creates a first-round Match only where both places are filled", () => {
        assert.equal(tree.firstRound.length, size / 2);
        const firstRoundMatches = tree.matches.filter(
          (match) => match.round === 1,
        );
        assert.equal(firstRoundMatches.length, tree.matchesPerRound[0]);
        assert.equal(firstRoundMatches.length, size / 2 - tree.byeCount);
      });

      it("writes a Bye team into a second-round slot fed by no Match", () => {
        const matchPositions = new Set(
          tree.matches
            .filter((match) => match.round === 1)
            .map((match) => match.position),
        );
        for (const entry of tree.entries.filter((item) => item.round === 2)) {
          const fedBy = knockoutFedBy(entry.round, entry.position, entry.slot);
          assert.ok(fedBy);
          assert.equal(matchPositions.has(fedBy.position), false);
        }
      });
    });
  }

  it("places 6 entrants into a Quarter-final tree with 2 Byes on opposite halves", () => {
    const tree = treeFor(6);
    assert.deepEqual(tree.firstRound, [
      { kind: "bye", position: 1, entrant: 1 },
      { kind: "match", position: 2, slot1Entrant: 4, slot2Entrant: 5 },
      { kind: "bye", position: 3, entrant: 2 },
      { kind: "match", position: 4, slot1Entrant: 3, slot2Entrant: 6 },
    ]);
    assert.deepEqual(tree.matchesPerRound, [2, 2, 1]);
  });

  it("refuses fewer than two entrants", () => {
    assert.equal(buildKnockoutTree({ entrantCount: 1 }), null);
    assert.equal(buildKnockoutTree({ entrantCount: 0 }), null);
    assert.equal(buildKnockoutTree({ entrantCount: 2.5 }), null);
  });
});

describe("knockoutFeeds", () => {
  it("sends odd positions to slot 1 and even positions to slot 2 of the next round", () => {
    assert.deepEqual(knockoutFeeds(1, 1), { round: 2, position: 1, slot: 1 });
    assert.deepEqual(knockoutFeeds(1, 2), { round: 2, position: 1, slot: 2 });
    assert.deepEqual(knockoutFeeds(2, 3), { round: 3, position: 2, slot: 1 });
  });

  it("is undone by knockoutFedBy", () => {
    for (let position = 1; position <= 8; position += 1) {
      const fed = knockoutFeeds(1, position);
      assert.deepEqual(knockoutFedBy(fed.round, fed.position, fed.slot), {
        round: 1,
        position,
      });
    }
    assert.equal(knockoutFedBy(1, 1, 1), null);
  });
});

describe("Knockout round names and Match codes", () => {
  it("names each round by the teams left in it", () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((round) => knockoutRoundName(round, 5)),
      ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"],
    );
  });

  it("codes Matches Q1, S1 and Final", () => {
    assert.equal(knockoutMatchCode(1, 3, 3), "Q3");
    assert.equal(knockoutMatchCode(2, 1, 3), "S1");
    assert.equal(knockoutMatchCode(3, 1, 3), "Final");
    assert.equal(knockoutMatchCode(1, 5, 4), "R16-5");
  });
});

describe("knockoutOnlyReviewValue", () => {
  it("reads the first round and the Bye count", () => {
    assert.equal(
      knockoutOnlyReviewValue(treeFor(12)),
      "Round of 16 onward. 4 byes",
    );
    assert.equal(
      knockoutOnlyReviewValue(treeFor(14)),
      "Round of 16 onward. 2 byes",
    );
    assert.equal(
      knockoutOnlyReviewValue(treeFor(7)),
      "Quarter-finals onward. 1 bye",
    );
    assert.equal(knockoutOnlyReviewValue(treeFor(8)), "Quarter-finals onward");
    assert.equal(knockoutOnlyReviewValue(treeFor(4)), "Semi-finals onward");
  });
});

function poolTreeFor(
  poolCount: number,
  qualifiersPerPool: number,
): PoolKnockoutTree {
  const tree = buildPoolKnockoutTree({ poolCount, qualifiersPerPool });
  assert.ok(tree, `tree for ${poolCount} Pools, ${qualifiersPerPool} through`);
  return tree;
}

function halfOf(tree: KnockoutTree, entry: KnockoutEntry) {
  const positionsInRound = tree.size / 2 ** entry.round;
  return entry.position <= positionsInRound / 2 ? 1 : 2;
}

describe("buildPoolKnockoutTree", () => {
  for (const teamCount of TOURNAMENT_TEAM_COUNTS) {
    for (const poolCount of poolCountOptions(teamCount)) {
      const poolSizes = balancedPoolSizes(teamCount, poolCount);
      const range = qualifiersPerPoolRange(poolSizes);
      assert.ok(range, `${teamCount} teams in ${poolCount} Pools`);
      for (let through = range.min; through <= range.max; through += 1) {
        it(`${teamCount} teams, ${poolCount} Pools, ${through} through`, () => {
          const tree = poolTreeFor(poolCount, through);
          const entrantCount = poolCount * through;
          assert.equal(tree.entrantCount, entrantCount);
          assert.equal(tree.matchCount, entrantCount - 1);

          const entrants = tree.entries.map((entry) => entry.entrant);
          assert.deepEqual(
            entrants,
            Array.from({ length: entrantCount }, (_, index) => index + 1),
          );
          const places = new Set(
            tree.entries.map(
              (entry) => `${entry.round}:${entry.position}:${entry.slot}`,
            ),
          );
          assert.equal(places.size, entrantCount);

          const poolOf = (entrant: number) =>
            tree.qualifiers[entrant - 1]?.pool;
          if (poolCount >= 2) {
            for (const place of tree.firstRound) {
              if (place.kind === "match") {
                assert.notEqual(
                  poolOf(place.slot1Entrant),
                  poolOf(place.slot2Entrant),
                  `first-round position ${place.position}`,
                );
              }
            }
          }

          const byes = tree.firstRound
            .flatMap((place) => (place.kind === "bye" ? [place.entrant] : []))
            .sort((left, right) => left - right);
          assert.deepEqual(
            byes,
            Array.from({ length: tree.byeCount }, (_, index) => index + 1),
          );

          if (poolCount === 2 && through === 2) {
            for (const pool of [0, 1]) {
              const halves = tree.entries
                .filter((entry) => poolOf(entry.entrant) === pool)
                .map((entry) => halfOf(tree, entry));
              assert.deepEqual([...halves].sort(), [1, 2]);
            }
          }
        });
      }
    }
  }

  it("orders entrants by Pool place, then by Pool", () => {
    const tree = poolTreeFor(3, 2);
    assert.deepEqual(
      tree.qualifiers.map((qualifier) =>
        knockoutQualifierLabel(qualifier.pool + 1, qualifier.position),
      ),
      ["A1", "B1", "C1", "A2", "B2", "C2"],
    );
  });

  it("gives the Byes to Pool winners in Pool order", () => {
    const tree = poolTreeFor(3, 2);
    assert.equal(tree.byeCount, 2);
    const byeQualifiers = tree.firstRound.flatMap((place) =>
      place.kind === "bye" ? [tree.qualifiers[place.entrant - 1]] : [],
    );
    assert.deepEqual(
      byeQualifiers
        .map((qualifier) =>
          qualifier
            ? knockoutQualifierLabel(qualifier.pool + 1, qualifier.position)
            : "",
        )
        .sort(),
      ["A1", "B1"],
    );
  });

  it("refuses a field with fewer than two qualifiers", () => {
    assert.equal(
      buildPoolKnockoutTree({ poolCount: 1, qualifiersPerPool: 1 }),
      null,
    );
    assert.equal(
      buildPoolKnockoutTree({ poolCount: 2, qualifiersPerPool: 0 }),
      null,
    );
  });
});

describe("Qualifiers per Pool", () => {
  it("ranges from 1 to one fewer than the smallest Pool", () => {
    assert.deepEqual(qualifiersPerPoolRange([4, 4, 3]), { min: 1, max: 2 });
    assert.deepEqual(qualifiersPerPoolRange([6, 6]), { min: 1, max: 5 });
  });

  it("starts a single Pool at 2", () => {
    assert.deepEqual(qualifiersPerPoolRange([8]), { min: 2, max: 7 });
  });

  it("defaults to 2, or the highest allowed value", () => {
    assert.equal(defaultQualifiersPerPool([4, 4, 4]), 2);
    assert.equal(defaultQualifiersPerPool([2, 2]), 1);
  });

  it("re-clamps into the range", () => {
    assert.equal(clampQualifiersPerPool([3, 3, 3, 3], 5), 2);
    assert.equal(clampQualifiersPerPool([10], 1), 2);
  });

  it("validates the stored value against the planned Pools", () => {
    assert.deepEqual(validateQualifiersPerPool([4, 4, 4], 3), {
      ok: true,
      qualifiersPerPool: 3,
    });
    assert.equal(validateQualifiersPerPool([4, 4, 4], 4).ok, false);
    assert.equal(validateQualifiersPerPool([4, 4, 4], 0).ok, false);
    assert.equal(validateQualifiersPerPool([12], 1).ok, false);
    assert.deepEqual(validateQualifiersPerPool([12], null), {
      ok: true,
      qualifiersPerPool: 2,
    });
  });

  it("caps the stored value at the drawn smallest Pool minus 1", () => {
    assert.equal(resolveQualifiersPerPool([4, 3, 3], 3), 2);
    assert.equal(resolveQualifiersPerPool([5, 5], 3), 3);
    assert.equal(resolveQualifiersPerPool([5, 5], null), 2);
    assert.equal(resolveQualifiersPerPool([], 2), null);
  });
});

describe("Groups then knockout copy", () => {
  it("states the teams into the knockout and the Byes", () => {
    assert.equal(
      qualifiersConsequenceLine(poolTreeFor(3, 2)),
      "6 teams into the knockout, 2 byes.",
    );
    assert.equal(
      qualifiersConsequenceLine(poolTreeFor(4, 2)),
      "8 teams into the knockout.",
    );
  });

  it("reads the review Knockout row", () => {
    assert.equal(
      groupsThenKnockoutReviewValue({
        tree: poolTreeFor(3, 2),
        poolCount: 3,
        qualifiersPerPool: 2,
      }),
      "Top two in each group, quarters onward. 2 byes",
    );
    assert.equal(
      groupsThenKnockoutReviewValue({
        tree: poolTreeFor(1, 2),
        poolCount: 1,
        qualifiersPerPool: 2,
      }),
      "Top two, final",
    );
    assert.equal(
      groupsThenKnockoutReviewValue({
        tree: poolTreeFor(2, 2),
        poolCount: 2,
        qualifiersPerPool: 2,
      }),
      "Top two in each group, semis, then the final",
    );
  });
});

describe("knockoutMatchRoundName", () => {
  it("names one Match of each Knockout round", () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((round) => knockoutMatchRoundName(round, 5)),
      ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final"],
    );
  });
});

describe("knockoutStartWord", () => {
  it("names where the Knockout starts in a size line", () => {
    assert.deepEqual(
      [1, 2, 3, 4].map((roundCount) => knockoutStartWord(roundCount)),
      ["the final", "semis", "quarters", "the round of 16"],
    );
  });
});
