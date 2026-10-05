import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  friendlyGameCtaCopy,
  friendlyGameFooterActions,
} from "./friendly-game-actions";

const player = {
  isOrganizer: false,
  canLeaveGame: true,
  canReportWrongScore: null,
  playerCount: 3,
};

describe("friendlyGameFooterActions", () => {
  it("gives a seated player Leave Game and nothing else", () => {
    const actions = friendlyGameFooterActions({ ...player, phase: "upcoming" });
    assert.deepEqual(
      actions.map((action) => action.kind),
      ["leave_game"],
    );
  });

  it("gives a non-seated player nothing", () => {
    assert.deepEqual(
      friendlyGameFooterActions({
        ...player,
        canLeaveGame: false,
        phase: "final",
      }),
      [],
    );
  });

  it("gives an organizer edit and cancel before the Game, with the player count", () => {
    const actions = friendlyGameFooterActions({
      ...player,
      isOrganizer: true,
      canLeaveGame: false,
      phase: "ongoing",
    });
    assert.deepEqual(
      actions.map((action) => action.kind),
      ["edit", "cancel_game"],
    );
    assert.equal(
      actions[1]?.consequence,
      "Removes it from the calendar for all 3 players.",
    );
  });

  it("offers Mark as not played when results are due", () => {
    const [action] = friendlyGameFooterActions({
      ...player,
      isOrganizer: true,
      canLeaveGame: false,
      phase: "needs_results",
    });
    assert.equal(action?.kind, "mark_as_not_played");
  });

  it("locks Report a wrong score when it is not eligible", () => {
    const [action] = friendlyGameFooterActions({
      ...player,
      isOrganizer: true,
      canLeaveGame: false,
      phase: "final",
      canReportWrongScore: { eligible: false },
    });
    assert.equal(action?.kind, "report_wrong_score_locked");
    assert.equal(action?.enabled, false);
  });
});

describe("friendlyGameCtaCopy", () => {
  it("has no bar for none", () => {
    assert.equal(friendlyGameCtaCopy({ kind: "none" }), null);
  });

  it("states the viewer's status once, with the open seats", () => {
    assert.deepEqual(
      friendlyGameCtaCopy({
        kind: "upcoming",
        vacantSeatCount: 1,
        showInvite: false,
      }),
      {
        title: "You're in",
        subline: "One spot left to fill",
        actionLabel: null,
        pendingLabel: null,
      },
    );
  });

  it("names the Waitlist place and offers to leave", () => {
    const copy = friendlyGameCtaCopy({ kind: "waitlisted", place: 3 });
    assert.equal(copy?.title, "You're 3rd on the Waitlist");
    assert.equal(copy?.actionLabel, "Leave waitlist");
  });

  it("reports the new Level after a final Game", () => {
    const copy = friendlyGameCtaCopy({
      kind: "final",
      newLevelBand: "C2",
      newLevel: 3.6,
    });
    assert.equal(copy?.title, "Level updated");
    assert.match(copy?.subline ?? "", /3\.6 after this game$/);
  });

  it("offers browsing for a cancelled Game", () => {
    assert.equal(
      friendlyGameCtaCopy({ kind: "browse" })?.actionLabel,
      "Browse open games",
    );
  });
});
