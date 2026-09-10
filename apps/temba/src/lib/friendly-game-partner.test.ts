import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  firstFullyVacantSideIndex,
  hasFullyVacantSide,
  offersPartnerJoin,
  type OffersPartnerJoinInput,
} from "./friendly-game-partner";

const occupant = { name: "Ada" };

function sides(
  rows: { left: unknown; right: unknown }[],
): OffersPartnerJoinInput["sides"] {
  return rows.map((row, index) => ({
    sideIndex: index + 1,
    left: row.left,
    right: row.right,
  }));
}

function emptyCourt() {
  return sides([
    { left: null, right: null },
    { left: null, right: null },
  ]);
}

function input(
  overrides: Partial<OffersPartnerJoinInput> = {},
): OffersPartnerJoinInput {
  return {
    canRegister: true,
    format: "friendly_game",
    registrationMode: "individual",
    sides: emptyCourt(),
    ...overrides,
  };
}

describe("hasFullyVacantSide", () => {
  it("is false when no side is fully vacant", () => {
    assert.equal(
      hasFullyVacantSide(
        sides([
          { left: occupant, right: occupant },
          { left: occupant, right: occupant },
        ]),
      ),
      false,
    );
  });

  it("is true when one side is fully vacant", () => {
    assert.equal(
      hasFullyVacantSide(
        sides([
          { left: occupant, right: null },
          { left: null, right: null },
        ]),
      ),
      true,
    );
  });

  it("is true when two sides are fully vacant", () => {
    assert.equal(hasFullyVacantSide(emptyCourt()), true);
  });

  it("is false when sides are only half-full", () => {
    assert.equal(
      hasFullyVacantSide(
        sides([
          { left: occupant, right: null },
          { left: null, right: occupant },
        ]),
      ),
      false,
    );
  });
});

describe("firstFullyVacantSideIndex", () => {
  it("returns the first vacant side's index", () => {
    assert.equal(
      firstFullyVacantSideIndex(
        sides([
          { left: occupant, right: null },
          { left: null, right: null },
        ]),
      ),
      2,
    );
  });

  it("returns null when no side is fully vacant", () => {
    assert.equal(
      firstFullyVacantSideIndex(
        sides([
          { left: occupant, right: null },
          { left: null, right: occupant },
        ]),
      ),
      null,
    );
  });
});

describe("offersPartnerJoin", () => {
  it("offers the partner path on an empty individual Friendly game", () => {
    assert.equal(offersPartnerJoin(input()), true);
  });

  it("offers when one side is fully vacant", () => {
    assert.equal(
      offersPartnerJoin(
        input({
          sides: sides([
            { left: occupant, right: occupant },
            { left: null, right: null },
          ]),
        }),
      ),
      true,
    );
  });

  it("offers when two sides are fully vacant", () => {
    assert.equal(offersPartnerJoin(input({ sides: emptyCourt() })), true);
  });

  it("skips when no side is fully vacant", () => {
    assert.equal(
      offersPartnerJoin(
        input({
          sides: sides([
            { left: occupant, right: occupant },
            { left: occupant, right: occupant },
          ]),
        }),
      ),
      false,
    );
  });

  it("skips when sides are only half-full", () => {
    assert.equal(
      offersPartnerJoin(
        input({
          sides: sides([
            { left: occupant, right: null },
            { left: null, right: occupant },
          ]),
        }),
      ),
      false,
    );
  });

  it("skips a full Game", () => {
    assert.equal(
      offersPartnerJoin(
        input({
          canRegister: false,
          sides: sides([
            { left: occupant, right: occupant },
            { left: occupant, right: occupant },
          ]),
        }),
      ),
      false,
    );
  });

  it("skips when canRegister is false", () => {
    assert.equal(offersPartnerJoin(input({ canRegister: false })), false);
  });

  it("skips a team-only Game", () => {
    assert.equal(
      offersPartnerJoin(input({ registrationMode: "team_only" })),
      false,
    );
  });

  it("skips an Americano", () => {
    assert.equal(offersPartnerJoin(input({ format: "americano" })), false);
  });
});
