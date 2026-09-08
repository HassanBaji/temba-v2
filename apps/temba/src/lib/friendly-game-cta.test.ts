import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  friendlyGameCanMintInvite,
  friendlyGameCtaFamily,
  friendlyGameJoinSheetCaption,
  friendlyGameLevelUpdatedLine,
  friendlyGameOverflowItems,
  friendlyGameVacantSeatLine,
  friendlyGameWaitlistLine,
  vacantJoinSeats,
  type FriendlyGameCtaInput,
  type FriendlyGameOverflowInput,
} from "./friendly-game-cta";

function cta(
  overrides: Partial<FriendlyGameCtaInput> = {},
): FriendlyGameCtaInput {
  return {
    cancelled: false,
    phase: null,
    canScoreSets: false,
    canWaitlist: false,
    isWaitlisted: false,
    waitlistPlace: null,
    canRegister: false,
    isSeated: false,
    isRegistered: false,
    canMintInvite: false,
    vacantSeatCount: 0,
    ratingImpact: null,
    ...overrides,
  };
}

function overflow(
  overrides: Partial<FriendlyGameOverflowInput> = {},
): FriendlyGameOverflowInput {
  return {
    isOrganizer: false,
    cancelled: false,
    registrationClosed: false,
    canMintInvite: false,
    isWaitlisted: false,
    ...overrides,
  };
}

describe("friendlyGameCtaFamily", () => {
  it("maps cancelled to Browse open games regardless of phase", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ cancelled: true, canRegister: true, phase: "final" }),
      ),
      { kind: "browse" },
    );
  });

  it("maps Upcoming phase for a seated viewer to You're in with vacancy and invite gating", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ phase: "upcoming", isSeated: true, vacantSeatCount: 1 }),
      ),
      { kind: "upcoming", vacantSeatCount: 1, showInvite: false },
    );
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({
          phase: "upcoming",
          isRegistered: true,
          vacantSeatCount: 0,
          canMintInvite: true,
        }),
      ),
      { kind: "upcoming", vacantSeatCount: 0, showInvite: true },
    );
  });

  it("collapses ongoing into the same Upcoming bar as upcoming", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ phase: "ongoing", isSeated: true, vacantSeatCount: 2 }),
      ),
      { kind: "upcoming", vacantSeatCount: 2, showInvite: false },
    );
  });

  it("maps Needs a score phase with score permission to Add result", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({
          phase: "needs_results",
          canScoreSets: true,
          isSeated: true,
        }),
      ),
      { kind: "needs_score" },
    );
  });

  it("has no sticky CTA in Needs a score phase without score permission", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({
          phase: "needs_results",
          canScoreSets: false,
          isSeated: true,
        }),
      ),
      { kind: "none" },
    );
  });

  it("maps Final phase with a viewer rating impact to Level updated", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({
          phase: "final",
          isSeated: true,
          ratingImpact: { newLevelBand: "C2", newLevel: 2.9 },
        }),
      ),
      { kind: "final", newLevelBand: "C2", newLevel: 2.9 },
    );
  });

  it("has no sticky CTA in Final phase when the viewer has no rating impact", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ phase: "final", isSeated: true, ratingImpact: null }),
      ),
      { kind: "none" },
    );
  });

  it("maps full-path waitlist and Nth waitlisted standing", () => {
    assert.deepEqual(friendlyGameCtaFamily(cta({ canWaitlist: true })), {
      kind: "join_waitlist",
    });
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ isWaitlisted: true, waitlistPlace: 3, canRegister: true }),
      ),
      { kind: "waitlisted", place: 3 },
    );
    assert.equal(friendlyGameWaitlistLine(3), "You're 3rd on the Waitlist");
  });

  it("maps Join when the viewer may register", () => {
    assert.deepEqual(friendlyGameCtaFamily(cta({ canRegister: true })), {
      kind: "join",
    });
  });

  it("offers Join to an Organizer who is not seated when they may register", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(cta({ canRegister: true, canMintInvite: true })),
      { kind: "join" },
    );
  });

  it("has no sticky CTA when closed, completed, or viewer-only", () => {
    assert.deepEqual(friendlyGameCtaFamily(cta()), { kind: "none" });
    assert.deepEqual(
      friendlyGameCtaFamily(cta({ isSeated: true, phase: null })),
      { kind: "none" },
    );
  });
});

describe("friendlyGameVacantSeatLine", () => {
  it("is null when the court is full", () => {
    assert.equal(friendlyGameVacantSeatLine(0), null);
  });

  it("singularizes exactly one spot", () => {
    assert.equal(friendlyGameVacantSeatLine(1), "One spot left to fill");
  });

  it("pluralizes more than one spot", () => {
    assert.equal(friendlyGameVacantSeatLine(3), "3 spots left to fill");
  });
});

describe("friendlyGameLevelUpdatedLine", () => {
  it("renders the display band remap, not the raw stored band", () => {
    assert.equal(
      friendlyGameLevelUpdatedLine("C2", 2.9),
      "C · 2.9 after this game",
    );
  });

  it("renders the collapsed-plus display rung for a plus-tier stored band", () => {
    assert.equal(
      friendlyGameLevelUpdatedLine("C1", 3.1),
      "C+ · 3.1 after this game",
    );
  });
});

describe("friendlyGameCanMintInvite", () => {
  it("is only true for an Organizer on an open or full Game", () => {
    assert.equal(
      friendlyGameCanMintInvite({
        isOrganizer: true,
        registrationStatus: "open",
      }),
      true,
    );
    assert.equal(
      friendlyGameCanMintInvite({
        isOrganizer: true,
        registrationStatus: "full",
      }),
      true,
    );
    assert.equal(
      friendlyGameCanMintInvite({
        isOrganizer: true,
        registrationStatus: "closed",
      }),
      false,
    );
    assert.equal(
      friendlyGameCanMintInvite({
        isOrganizer: true,
        registrationStatus: "cancelled",
      }),
      false,
    );
    assert.equal(
      friendlyGameCanMintInvite({
        isOrganizer: false,
        registrationStatus: "open",
      }),
      false,
    );
  });
});

describe("friendlyGameOverflowItems", () => {
  it("lists Organizer registration/invite tools, never Edit or Cancel game", () => {
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({ isOrganizer: true, canMintInvite: true }),
      ),
      ["close_registration", "invite", "share"],
    );
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({
          isOrganizer: true,
          registrationClosed: true,
          canMintInvite: false,
        }),
      ),
      ["reopen_registration"],
    );
  });

  it("hides overflow when empty and never lists Leave game (footer-only)", () => {
    assert.deepEqual(friendlyGameOverflowItems(overflow()), []);
    assert.deepEqual(friendlyGameOverflowItems(overflow()), []);
    assert.deepEqual(
      friendlyGameOverflowItems(overflow({ isWaitlisted: true })),
      ["leave_waitlist"],
    );
  });

  it("keeps Organizer overflow when the Organizer is not seated", () => {
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({ isOrganizer: true, canMintInvite: true }),
      ),
      ["close_registration", "invite", "share"],
    );
  });

  it("does not offer Share when cancelled", () => {
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({
          isOrganizer: true,
          cancelled: true,
          canMintInvite: false,
        }),
      ),
      [],
    );
  });
});

describe("vacantJoinSeats", () => {
  it("lists only vacant Positions and does not invent a default seat", () => {
    assert.deepEqual(
      vacantJoinSeats([
        { sideIndex: 1, left: { userId: "a" }, right: null },
        { sideIndex: 2, left: { userId: "b" }, right: { userId: "c" } },
      ]),
      [{ sideIndex: 1, position: "right" }],
    );
  });

  it("is empty when every Position is filled", () => {
    assert.deepEqual(
      vacantJoinSeats([
        { sideIndex: 1, left: { userId: "a" }, right: { userId: "b" } },
        { sideIndex: 2, left: { userId: "c" }, right: { userId: "d" } },
      ]),
      [],
    );
  });
});

describe("friendlyGameJoinSheetCaption", () => {
  const sides = [
    { sideIndex: 1, left: { name: "Nasser" }, right: null },
    { sideIndex: 2, left: null, right: null },
  ];

  it("counts the open spots when nothing is picked yet", () => {
    assert.equal(
      friendlyGameJoinSheetCaption(sides, null),
      "3 of 4 spots still open. Tap one to take it",
    );
  });

  it("uses the singular line for the last open spot", () => {
    assert.equal(
      friendlyGameJoinSheetCaption(
        [
          { sideIndex: 1, left: { name: "Nasser" }, right: { name: "Ali" } },
          { sideIndex: 2, left: { name: "Yousif" }, right: null },
        ],
        null,
      ),
      "One spot still open. Tap it to take it",
    );
  });

  it("says the Game is full when no Position is vacant", () => {
    assert.equal(
      friendlyGameJoinSheetCaption(
        [
          { sideIndex: 1, left: { name: "Nasser" }, right: { name: "Ali" } },
          { sideIndex: 2, left: { name: "Yousif" }, right: { name: "Omar" } },
        ],
        null,
      ),
      "Every spot on this Game is taken",
    );
  });

  it("names the partner already on the picked Game team", () => {
    assert.equal(
      friendlyGameJoinSheetCaption(sides, { sideIndex: 1, position: "right" }),
      "You'll play with Nasser",
    );
  });

  it("flags an open partner Position on the picked Game team", () => {
    assert.equal(
      friendlyGameJoinSheetCaption(sides, { sideIndex: 2, position: "left" }),
      "Your partner spot is still open — anyone can take it",
    );
  });
});
