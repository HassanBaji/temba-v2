import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  firstFullyVacantSideIndex,
  friendlyGameHomeHref,
  hasFullyVacantSide,
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceRecovery,
  seedPartnerCallerPosition,
  viewerSidePartnerName,
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

describe("seedPartnerCallerPosition", () => {
  it("satisfies both when preferences are opposite", () => {
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: "left",
        partnerPreferred: "right",
      }),
      "left",
    );
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: "right",
        partnerPreferred: "left",
      }),
      "right",
    );
  });

  it("uses the viewer's Preferred Position when the partner wants the same", () => {
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: "left",
        partnerPreferred: "left",
      }),
      "left",
    );
  });

  it("gives the partner their side when the viewer has no preference", () => {
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: "either",
        partnerPreferred: "right",
      }),
      "left",
    );
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: null,
        partnerPreferred: "left",
      }),
      "right",
    );
  });

  it("defaults to left when neither has a side preference", () => {
    assert.equal(
      seedPartnerCallerPosition({
        viewerPreferred: "either",
        partnerPreferred: null,
      }),
      "left",
    );
  });
});

describe("viewerSidePartnerName", () => {
  const viewer = { userId: "viewer", name: "Ada" };
  const partner = { userId: "partner", name: "Sofia L" };
  const other = { userId: "other", name: "Jonas B" };

  it("returns the occupant of the other Position on the viewer's side", () => {
    assert.equal(
      viewerSidePartnerName({
        viewerUserId: viewer.userId,
        sides: [
          { left: viewer, right: partner },
          { left: other, right: null },
        ],
      }),
      "Sofia L",
    );
    assert.equal(
      viewerSidePartnerName({
        viewerUserId: viewer.userId,
        sides: [
          { left: partner, right: viewer },
          { left: null, right: null },
        ],
      }),
      "Sofia L",
    );
  });

  it("returns null when the viewer sits alone on their side", () => {
    assert.equal(
      viewerSidePartnerName({
        viewerUserId: viewer.userId,
        sides: [
          { left: viewer, right: null },
          { left: other, right: null },
        ],
      }),
      null,
    );
  });

  it("returns null when the viewer is not seated", () => {
    assert.equal(
      viewerSidePartnerName({
        viewerUserId: viewer.userId,
        sides: [
          { left: partner, right: other },
          { left: null, right: null },
        ],
      }),
      null,
    );
  });
});

describe("friendlyGameHomeHref", () => {
  it("is that Game's home", () => {
    assert.equal(friendlyGameHomeHref("game-1"), "/dashboard/games/game-1");
  });
});

describe("partnerVacantSideRaceRecovery", () => {
  it("stays on Pick a partner when a fully vacant side remains", () => {
    assert.equal(
      partnerVacantSideRaceRecovery(
        sides([
          { left: occupant, right: occupant },
          { left: null, right: null },
        ]),
      ),
      "picker",
    );
  });

  it("leaves for Game home when no fully vacant side remains", () => {
    assert.equal(
      partnerVacantSideRaceRecovery(
        sides([
          { left: occupant, right: null },
          { left: null, right: occupant },
        ]),
      ),
      "game_home",
    );
  });
});

describe("isPartnerVacantSideRace", () => {
  it("treats CONFLICT and vacant-side messages as a race", () => {
    assert.equal(
      isPartnerVacantSideRace({
        message: "That side already has a User",
        data: { code: "CONFLICT" },
      }),
      true,
    );
    assert.equal(
      isPartnerVacantSideRace({
        message: "No fully vacant side; pick a seat",
      }),
      true,
    );
    assert.equal(
      isPartnerVacantSideRace({
        message: "That User's Level is outside this Game's range",
      }),
      false,
    );
  });
});
