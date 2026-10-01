import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  buildKnockoutTree,
  knockoutFedBy,
  knockoutFeeds,
  knockoutMatchCode,
  knockoutOnlyReviewValue,
  knockoutRoundName,
  type KnockoutTree,
} from "~/lib/tournament-knockout";
import { TOURNAMENT_TEAM_COUNTS } from "~/lib/tournament-sizing";

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
