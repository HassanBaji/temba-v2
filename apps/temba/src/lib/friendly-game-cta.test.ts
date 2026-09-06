import assert from "node:assert/strict";
import { describe, it } from "vitest";

import type { GameHomeTab } from "./game-home-tab";
import {
  friendlyGameCanMintInvite,
  friendlyGameCtaFamily,
  friendlyGameOverflowItems,
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
    canScoreSets: false,
    tab: "overview",
    canWaitlist: false,
    isWaitlisted: false,
    waitlistPlace: null,
    canRegister: false,
    isSeated: false,
    isRegistered: false,
    canMintInvite: false,
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
    isSeated: false,
    isRegistered: false,
    isWaitlisted: false,
    canLeave: false,
    ...overrides,
  };
}

describe("friendlyGameCtaFamily", () => {
  it("maps cancelled to Browse open games", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ cancelled: true, canRegister: true, canScoreSets: true }),
      ),
      { kind: "browse" },
    );
  });

  it("maps Enter score off Results and hides it on Results", () => {
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ canScoreSets: true, canRegister: true, tab: "players" }),
      ),
      { kind: "enter_score" },
    );
    assert.deepEqual(
      friendlyGameCtaFamily(
        cta({ canScoreSets: true, canRegister: true, tab: "results" }),
      ),
      { kind: "join" },
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

  it("maps seated or registered to You're playing, with Invite when mint is allowed", () => {
    assert.deepEqual(friendlyGameCtaFamily(cta({ isSeated: true })), {
      kind: "playing",
      showInvite: false,
    });
    assert.deepEqual(
      friendlyGameCtaFamily(cta({ isRegistered: true, canMintInvite: true })),
      { kind: "playing", showInvite: true },
    );
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
      friendlyGameCtaFamily(
        cta({ tab: "results" as GameHomeTab, canScoreSets: false }),
      ),
      { kind: "none" },
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
  it("lists Organizer tools including Share only when mint is allowed", () => {
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({ isOrganizer: true, canMintInvite: true }),
      ),
      ["edit", "close_registration", "invite", "share", "cancel_game"],
    );
    assert.deepEqual(
      friendlyGameOverflowItems(
        overflow({
          isOrganizer: true,
          registrationClosed: true,
          canMintInvite: false,
        }),
      ),
      ["edit", "reopen_registration", "cancel_game"],
    );
  });

  it("hides overflow when empty and keeps seated non-Organizer to Leave", () => {
    assert.deepEqual(friendlyGameOverflowItems(overflow()), []);
    assert.deepEqual(
      friendlyGameOverflowItems(overflow({ isSeated: true, canLeave: true })),
      ["leave"],
    );
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
      ["edit", "close_registration", "invite", "share", "cancel_game"],
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
