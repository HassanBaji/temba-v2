import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmationRows,
  scoreFooterNote,
  scoreGamesWonForSide,
  scoreNameByUserId,
  scoreSetBoxAccessibleLabel,
  scoreSetBoxState,
  scoreShowsConfirmations,
  scoreTeamNamesLabel,
} from "./friendly-game-score";

const sides = [
  {
    sideIndex: 1,
    gameTeamId: "a",
    left: { userId: "u1", name: "Alex" },
    right: { userId: "u2", name: "Sam" },
  },
  {
    sideIndex: 2,
    gameTeamId: "b",
    left: { userId: "u3", name: "Riley" },
    right: null,
  },
];

describe("scoreSetBoxState", () => {
  it("locks every box before results are due", () => {
    for (const phase of ["upcoming", "ongoing"] as const) {
      assert.equal(
        scoreSetBoxState({
          phase,
          neverPlayed: false,
          canEnter: true,
          isWinningSide: false,
        }),
        "locked",
      );
    }
  });

  it("lets a writer enter and everyone else read while results are due", () => {
    const base = {
      phase: "needs_results",
      neverPlayed: false,
      isWinningSide: false,
    } as const;
    assert.equal(scoreSetBoxState({ ...base, canEnter: true }), "enterable");
    assert.equal(scoreSetBoxState({ ...base, canEnter: false }), "readonly");
  });

  it("fills the winning side, outlines the other and hatches an unplayed Set when final", () => {
    const base = { phase: "final", canEnter: false } as const;
    assert.equal(
      scoreSetBoxState({ ...base, neverPlayed: false, isWinningSide: true }),
      "solid",
    );
    assert.equal(
      scoreSetBoxState({ ...base, neverPlayed: false, isWinningSide: false }),
      "outline",
    );
    assert.equal(
      scoreSetBoxState({ ...base, neverPlayed: true, isWinningSide: true }),
      "unplayed",
    );
  });
});

describe("score helpers", () => {
  it("enters scores only when results are due and the Match allows it", () => {
    assert.equal(scoreCanEnter("needs_results", true), true);
    assert.equal(scoreCanEnter("needs_results", false), false);
    assert.equal(scoreCanEnter("final", true), false);
  });

  it("maps side 1 to slot 1 and side 2 to slot 2", () => {
    const set = { slot1GamesWon: 6, slot2GamesWon: 2 };
    assert.equal(scoreGamesWonForSide(set, 1), 6);
    assert.equal(scoreGamesWonForSide(set, 2), 2);
  });

  it("labels a team with Open for a vacant seat", () => {
    assert.equal(scoreTeamNamesLabel(sides[0]!), "Alex & Sam");
    assert.equal(scoreTeamNamesLabel(sides[1]!), "Riley & Open");
  });

  it("describes a box to a screen reader without relying on the hatch", () => {
    assert.equal(
      scoreSetBoxAccessibleLabel("solid", "Team A, Set 1", 6),
      "Team A, Set 1: 6 games, won this Set",
    );
    assert.equal(
      scoreSetBoxAccessibleLabel("outline", "Team B, Set 1", 3),
      "Team B, Set 1: 3 games, lost this Set",
    );
    assert.equal(
      scoreSetBoxAccessibleLabel("readonly", "Team A, Set 1", null),
      "Team A, Set 1: not entered yet",
    );
    assert.equal(
      scoreSetBoxAccessibleLabel("locked", "Team A, Set 1", null),
      "Team A, Set 1",
    );
  });

  it("writes the footer note for each phase", () => {
    assert.match(
      scoreFooterNote("upcoming", null),
      /Scoring opens when the court is full/,
    );
    assert.match(
      scoreFooterNote("needs_results", null),
      /The other three confirm/,
    );
    assert.equal(
      scoreFooterNote("final", "Mon 5 Oct"),
      "Confirmed by all four players on Mon 5 Oct. Nothing else needed.",
    );
    assert.equal(
      scoreFooterNote("final", null),
      "Confirmed by all four players. Nothing else needed.",
    );
  });
});

describe("confirmations", () => {
  const confirmation = {
    confirmedUserIds: ["u1"],
    requiredUserIds: ["u1", "u2", "u3"],
    viewerHasConfirmed: true,
  };

  it("lists who confirmed and who is still waiting, marking the viewer", () => {
    assert.deepEqual(
      scoreConfirmationRows(confirmation, "u1", scoreNameByUserId(sides)).map(
        (row) => [row.label, row.status],
      ),
      [
        ["Alex (You)", "Confirmed"],
        ["Sam", "Waiting"],
        ["Riley", "Waiting"],
      ],
    );
  });

  it("names an unknown player generically", () => {
    const [row] = scoreConfirmationRows(
      { ...confirmation, requiredUserIds: ["x"] },
      "u1",
      new Map(),
    );
    assert.equal(row?.label, "Player");
  });

  it("shows confirmations only while results are due and a result exists", () => {
    assert.equal(
      scoreShowsConfirmations({
        confirmation,
        hasResult: true,
        phase: "needs_results",
      }),
      true,
    );
    assert.equal(
      scoreShowsConfirmations({
        confirmation,
        hasResult: false,
        phase: "needs_results",
      }),
      false,
    );
    assert.equal(
      scoreShowsConfirmations({
        confirmation,
        hasResult: true,
        phase: "final",
      }),
      false,
    );
  });

  it("lets only a required, not-yet-confirmed viewer confirm", () => {
    const open = { ...confirmation, viewerHasConfirmed: false };
    const input = {
      confirmation: open,
      hasResult: true,
      phase: "needs_results" as const,
    };
    assert.equal(scoreCanConfirm({ ...input, viewerUserId: "u2" }), true);
    assert.equal(
      scoreCanConfirm({ ...input, viewerUserId: "outsider" }),
      false,
    );
    assert.equal(
      scoreCanConfirm({ ...input, viewerUserId: "u1", confirmation }),
      false,
    );
    assert.equal(
      scoreCanConfirm({ ...input, viewerUserId: "u2", hasResult: false }),
      false,
    );
    assert.equal(
      scoreCanConfirm({ ...input, viewerUserId: "u2", phase: "final" }),
      false,
    );
  });
});
