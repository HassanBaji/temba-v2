import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  levelRangeQueueVisible,
  levelRangeRequestCard,
  levelRangeRequestRowMeta,
} from "./level-range-request";

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

describe("levelRangeQueueVisible", () => {
  it("shows the Organizer queue only for a Game with a range", () => {
    assert.equal(levelRangeQueueVisible({ isOrganizer: true, ...base }), true);
    assert.equal(
      levelRangeQueueVisible({
        isOrganizer: true,
        levelMinTenths: null,
        levelMaxTenths: null,
      }),
      false,
    );
    assert.equal(
      levelRangeQueueVisible({ isOrganizer: false, ...base }),
      false,
    );
  });
});

describe("levelRangeRequestRowMeta", () => {
  const now = new Date("2030-01-15T12:00:00Z");

  it("joins the Level, Provisional and when it was requested", () => {
    assert.equal(
      levelRangeRequestRowMeta(
        { levelTenths: 52, provisional: true, createdAt: now },
        now,
      ),
      "5.2 · Provisional · Requested today",
    );
  });

  it("says No Level for a User without a Rating", () => {
    assert.equal(
      levelRangeRequestRowMeta(
        { levelTenths: null, provisional: false, createdAt: now },
        now,
      ),
      "No Level · Requested today",
    );
  });
});
