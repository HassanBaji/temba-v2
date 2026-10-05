import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createFriendlyGameOrganizerFixtures } from "./friendly-game-details-fixtures";
import { friendlyGameOrganizerPlan } from "./friendly-game-organizer";

const NOW = new Date("2030-01-15T12:00:00Z");
const fixtures = createFriendlyGameOrganizerFixtures(NOW);

describe("friendlyGameOrganizerPlan", () => {
  it("is absent for a viewer who is not the Organizer", () => {
    assert.equal(
      friendlyGameOrganizerPlan({ ...fixtures.upcoming, isOrganizer: false }),
      null,
    );
  });

  it("is absent once the Game is cancelled", () => {
    assert.equal(friendlyGameOrganizerPlan(fixtures.cancelled), null);
  });

  it("offers to close an open registration and to reopen a closed one", () => {
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.upcoming, NOW)?.registration,
      "close",
    );
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.registrationClosed, NOW)?.registration,
      "reopen",
    );
  });

  it("lets the Organizer kick every seated player except themselves", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.needsScore, NOW);
    assert.ok(plan);
    assert.equal(plan.kickableUserIds.includes("user-viewer"), false);
    assert.equal(plan.kickableUserIds.length, 3);
  });

  it("lists the waitlist and the pending Level range requests", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.upcoming, NOW);
    assert.deepEqual(plan?.waitlist, [
      { id: "waitlist-1", name: "Noor Haddad", image: null },
    ]);
    assert.equal(plan?.showLevelRequests, true);
    assert.equal(plan?.levelRequests[0]?.name, "Tariq Aziz");
    assert.equal(plan?.levelRequests[0]?.meta.includes("Requested"), true);
  });

  it("hides the request queue when the Game has no Level range", () => {
    const plan = friendlyGameOrganizerPlan(
      { ...fixtures.upcoming, levelMinTenths: null, levelMaxTenths: null },
      NOW,
    );
    assert.equal(plan?.showLevelRequests, false);
  });

  it("offers Complete Match only when the server says a Match can complete", () => {
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.needsScore, NOW)?.completeMatchId,
      fixtures.needsScore.matches[0]?.id,
    );
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.final, NOW)?.completeMatchId,
      null,
    );
  });

  it("offers a Court on the Match that is still live", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.upcoming, NOW);
    assert.equal(plan?.court?.matchId, fixtures.upcoming.matches[0]?.id);
  });
});
