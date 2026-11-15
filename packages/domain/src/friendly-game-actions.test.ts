import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  footballReportWrongScoreAction,
  friendlyGameCtaCopy,
  friendlyGameFooterActions,
} from "./friendly-game-actions";

const player = {
  isOrganizer: false,
  canLeaveGame: true,
  canReportWrongScore: null,
  playerCount: 3,
  locale: "en" as const,
};

describe("friendlyGameFooterActions", () => {
  it("gives a seated player Leave Game and nothing else", () => {
    const actions = friendlyGameFooterActions({ ...player, phase: "upcoming" });
    assert.deepEqual(
      actions.map((action) => action.kind),
      ["leave_game"],
    );
  });

  it("drops Leave Game once the Game has been played", () => {
    for (const phase of ["needs_results", "final"] as const) {
      assert.deepEqual(friendlyGameFooterActions({ ...player, phase }), []);
    }
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

  it("writes the labels and consequences in Arabic", () => {
    const actions = friendlyGameFooterActions({
      ...player,
      isOrganizer: true,
      canLeaveGame: false,
      phase: "ongoing",
      locale: "ar",
    });
    assert.equal(actions[0]?.label, "تعديل المباراة");
    assert.equal(actions[1]?.consequence, "تُحذف من تقويم كل المسجّلين (3).");
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

describe("footballReportWrongScoreAction", () => {
  const groupGame = {
    groupId: "group",
    challenge: null,
    canReportWrongScore: { eligible: true },
  };

  it("offers Report a wrong score to the Organizer of a played football Group Game", () => {
    const action = footballReportWrongScoreAction(groupGame, "en");
    assert.equal(action?.kind, "report_wrong_score");
    assert.equal(action?.label, "Report a wrong score");
    assert.equal(action?.enabled, true);
  });

  it("locks it when the Match is not eligible", () => {
    const action = footballReportWrongScoreAction(
      { ...groupGame, canReportWrongScore: { eligible: false } },
      "en",
    );
    assert.equal(action?.kind, "report_wrong_score_locked");
    assert.equal(action?.enabled, false);
  });

  it("offers nothing to a player, on a groupless Game or on a Challenge Game", () => {
    for (const game of [
      { ...groupGame, canReportWrongScore: null },
      { ...groupGame, groupId: null },
      { ...groupGame, challenge: { sides: [] } },
    ]) {
      assert.equal(footballReportWrongScoreAction(game, "en"), null);
    }
  });

  it("writes the label in Arabic", () => {
    assert.equal(
      footballReportWrongScoreAction(groupGame, "ar")?.label,
      "الإبلاغ عن نتيجة خاطئة",
    );
  });
});

describe("friendlyGameCtaCopy", () => {
  it("has no bar for none", () => {
    assert.equal(friendlyGameCtaCopy({ kind: "none" }, "en"), null);
  });

  it("states the viewer's status once, with the open seats", () => {
    assert.deepEqual(
      friendlyGameCtaCopy(
        {
          kind: "upcoming",
          vacantSeatCount: 1,
          showInvite: false,
          live: false,
        },
        "en",
      ),
      {
        title: "You're in",
        subline: "One spot left to fill",
        actionLabel: null,
        pendingLabel: null,
      },
    );
  });

  it("names the Waitlist place and offers to leave", () => {
    const copy = friendlyGameCtaCopy({ kind: "waitlisted", place: 3 }, "en");
    assert.equal(copy?.title, "You're 3rd on the Waitlist");
    assert.equal(copy?.actionLabel, "Leave waitlist");
  });

  it("reports the new Level after a final Game", () => {
    const copy = friendlyGameCtaCopy(
      {
        kind: "final",
        newLevelBand: "C2",
        newLevel: 3.6,
      },
      "en",
    );
    assert.equal(copy?.title, "Level updated");
    assert.match(copy?.subline ?? "", /3\.6 after this game$/);
  });

  it("offers browsing for a cancelled Game", () => {
    assert.equal(
      friendlyGameCtaCopy({ kind: "browse" }, "en")?.actionLabel,
      "Browse open games",
    );
  });

  it("writes the bar in Arabic", () => {
    const copy = friendlyGameCtaCopy({ kind: "waitlisted", place: 3 }, "ar");
    assert.equal(copy?.title, "أنت في المرتبة 3 في قائمة الانتظار");
    assert.equal(copy?.actionLabel, "مغادرة قائمة الانتظار");
  });

  it("says the Game has started when spots are still open", () => {
    const upcoming = {
      kind: "upcoming",
      vacantSeatCount: 3,
      showInvite: false,
    };
    const before = friendlyGameCtaCopy(
      { ...upcoming, live: false } as const,
      "ar",
    );
    assert.equal(before?.title, "أنت في التشكيلة");
    assert.equal(before?.subline, "ينقص 3 لاعبين");
    assert.equal(
      friendlyGameCtaCopy({ ...upcoming, live: true } as const, "ar")?.subline,
      "بدأت المباراة وينقص 3 لاعبين",
    );
    assert.equal(
      friendlyGameCtaCopy({ ...upcoming, live: true } as const, "en")?.subline,
      "Started with 3 spots open",
    );
  });
});
