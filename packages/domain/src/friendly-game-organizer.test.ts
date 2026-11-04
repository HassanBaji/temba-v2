import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createFriendlyGameOrganizerFixtures } from "./friendly-game-details-fixtures";
import { friendlyGameOrganizerPlan } from "./friendly-game-organizer";

const NOW = new Date("2030-01-15T12:00:00Z");
const fixtures = createFriendlyGameOrganizerFixtures(NOW);

describe("friendlyGameOrganizerPlan", () => {
  it("is absent for a viewer who is not the Organizer", () => {
    assert.equal(
      friendlyGameOrganizerPlan(
        { ...fixtures.upcoming, isOrganizer: false },
        "en",
      ),
      null,
    );
  });

  it("is absent once the Game is cancelled", () => {
    assert.equal(friendlyGameOrganizerPlan(fixtures.cancelled, "en"), null);
  });

  it("offers to close an open registration and to reopen a closed one", () => {
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.upcoming, "en", NOW)?.registration,
      "close",
    );
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.registrationClosed, "en", NOW)
        ?.registration,
      "reopen",
    );
  });

  it("lets the Organizer kick every seated player except themselves", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.needsScore, "en", NOW);
    assert.ok(plan);
    assert.equal(plan.kickableUserIds.includes("user-viewer"), false);
    assert.equal(plan.kickableUserIds.length, 3);
  });

  it("lists the waitlist and the pending Level range requests", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.upcoming, "en", NOW);
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
      "en",
      NOW,
    );
    assert.equal(plan?.showLevelRequests, false);
  });

  it("offers Complete Match only when the server says a Match can complete", () => {
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.needsScore, "en", NOW)
        ?.completeMatchId,
      fixtures.needsScore.matches[0]?.id,
    );
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.final, "en", NOW)?.completeMatchId,
      null,
    );
  });

  it("offers Add player until the Match is completed", () => {
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.upcoming, "en", NOW)?.canAddPlayer,
      true,
    );
    assert.equal(
      friendlyGameOrganizerPlan(fixtures.final, "en", NOW)?.canAddPlayer,
      false,
    );
  });

  it("offers a Court on the Match that is still live", () => {
    const plan = friendlyGameOrganizerPlan(fixtures.upcoming, "en", NOW);
    assert.equal(plan?.court?.matchId, fixtures.upcoming.matches[0]?.id);
  });

  it("names a request without a user name in Arabic", () => {
    const plan = friendlyGameOrganizerPlan(
      {
        ...fixtures.upcoming,
        pendingLevelRangeRequests:
          fixtures.upcoming.pendingLevelRangeRequests.map((request) => ({
            ...request,
            user: { ...request.user, name: null },
          })),
      },
      "ar",
      NOW,
    );
    assert.equal(plan?.levelRequests[0]?.name, "مستخدم");
  });
});
