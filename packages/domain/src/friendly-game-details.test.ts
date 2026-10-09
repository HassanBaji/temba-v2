import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { friendlyGameDetailsPlan } from "./friendly-game-details";
import { createFriendlyGameDetailsFixtures } from "./friendly-game-details-fixtures";

const NOW = new Date("2026-10-04T12:00:00Z");
const fixtures = createFriendlyGameDetailsFixtures(NOW);

describe("friendlyGameDetailsPlan", () => {
  it("offers Join to a non-member who may register", () => {
    const plan = friendlyGameDetailsPlan(fixtures.nonMember);
    assert.equal(plan.ctaFamily.kind, "join");
    assert.equal(plan.canLeaveGame, false);
    assert.equal(plan.viewerGameTeamId, null);
  });

  it("offers the Waitlist on a full Game and the place once waitlisted", () => {
    assert.equal(
      friendlyGameDetailsPlan(fixtures.full).ctaFamily.kind,
      "join_waitlist",
    );
    assert.deepEqual(friendlyGameDetailsPlan(fixtures.waitlisted).ctaFamily, {
      kind: "waitlisted",
      place: 2,
    });
    assert.equal(
      friendlyGameDetailsPlan(fixtures.waitlisted).canLeaveGame,
      false,
    );
  });

  it("shows no action to a viewer outside the Level range who cannot register", () => {
    const plan = friendlyGameDetailsPlan(fixtures.levelBlocked);
    assert.equal(plan.ctaFamily.kind, "none");
  });

  it("states the seated viewer's status and counts vacant seats", () => {
    const plan = friendlyGameDetailsPlan(fixtures.registered);
    assert.deepEqual(plan.ctaFamily, {
      kind: "upcoming",
      vacantSeatCount: 2,
      showInvite: false,
    });
    assert.equal(plan.canLeaveGame, true);
    assert.equal(plan.partnerBesideName, null);
  });

  it("finds the partner seated beside the viewer", () => {
    const plan = friendlyGameDetailsPlan(fixtures.partnerBooked);
    assert.equal(plan.partnerBesideName, "Sam Chen");
    assert.equal(plan.viewerGameTeamId, "game-team-a");
  });

  it("asks for the score once results are due and the viewer may write", () => {
    assert.equal(
      friendlyGameDetailsPlan(fixtures.needsScore).ctaFamily.kind,
      "needs_score",
    );
  });

  it("names the winning team only when the Game is final", () => {
    assert.equal(
      friendlyGameDetailsPlan(fixtures.final).winningGameTeamId,
      "game-team-a",
    );
    assert.equal(
      friendlyGameDetailsPlan(fixtures.needsScore).winningGameTeamId,
      null,
    );
  });

  it("sends a cancelled Game's viewer to browse", () => {
    assert.equal(
      friendlyGameDetailsPlan(fixtures.cancelled).ctaFamily.kind,
      "browse",
    );
  });
});
