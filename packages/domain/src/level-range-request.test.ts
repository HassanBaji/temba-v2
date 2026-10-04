import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { levelRangeRequestCard } from "./level-range-request";

const base = {
  levelMinTenths: 30,
  levelMaxTenths: 45,
  viewerLevelTenths: 22,
  canRequestLevelRange: true,
  levelRangeRequest: null,
};

describe("levelRangeRequestCard", () => {
  it("offers the request to a viewer outside the range", () => {
    const card = levelRangeRequestCard(base);
    assert.equal(card?.actionLabel, "Request to play");
    assert.equal(card?.actionEnabled, true);
    assert.equal(card?.badge, null);
    assert.match(card?.copy ?? "", /^This Game is for Level /);
  });

  it("says Pending and offers no action while a request waits", () => {
    const card = levelRangeRequestCard({
      ...base,
      canRequestLevelRange: false,
      levelRangeRequest: { status: "pending" },
    });
    assert.equal(card?.badge, "Pending");
    assert.equal(card?.actionLabel, null);
  });

  it("offers Request again after a rejection", () => {
    const card = levelRangeRequestCard({
      ...base,
      levelRangeRequest: { status: "rejected" },
    });
    assert.equal(card?.badge, "Rejected");
    assert.equal(card?.actionLabel, "Request again");
  });

  it("hides the card once approved or when the viewer is not blocked", () => {
    assert.equal(
      levelRangeRequestCard({
        ...base,
        canRequestLevelRange: false,
        levelRangeRequest: { status: "approved" },
      }),
      null,
    );
    assert.equal(
      levelRangeRequestCard({ ...base, canRequestLevelRange: false }),
      null,
    );
  });

  it("asks a viewer with no Level to declare one", () => {
    const card = levelRangeRequestCard({ ...base, viewerLevelTenths: null });
    assert.match(card?.copy ?? "", /don't have a Level yet/);
  });
});
