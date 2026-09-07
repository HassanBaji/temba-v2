import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  formatHeroCountdown,
  formatHeroKickoffTrailer,
  formatHomeCountdown,
  formatHomeKickoff,
} from "./home-countdown";

describe("formatHomeCountdown", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  it("formats hours and minutes above an hour", () => {
    const start = new Date(now.getTime() + (5 * 60 + 42) * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now), "in 5h 42m");
  });

  it("drops to minutes under an hour", () => {
    const start = new Date(now.getTime() + 45 * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now), "in 45m");
  });

  it("returns null for a start that is not in the future", () => {
    assert.equal(formatHomeCountdown(now, now), null);
    assert.equal(
      formatHomeCountdown(new Date(now.getTime() - 60 * 1000), now),
      null,
    );
  });

  it("does not render in 0m for a start under a minute away", () => {
    const start = new Date(now.getTime() + 20 * 1000);
    assert.equal(formatHomeCountdown(start, now), "in 1m");
  });
});

describe("formatHomeKickoff", () => {
  it("keeps time as one object with trailing meridiem", () => {
    const start = new Date(2026, 8, 7, 21, 0, 0);
    const kickoff = formatHomeKickoff(start);
    assert.equal(kickoff.time.includes(" "), false);
    assert.match(kickoff.meridiem, /AM|PM/i);
  });
});

describe("formatHeroCountdown", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  it("matches formatHomeCountdown while the start is in the future", () => {
    const start = new Date(now.getTime() + 45 * 60 * 1000);
    assert.equal(formatHeroCountdown("upcoming", start, now), "in 45m");
  });

  it("reads Starting now for an ongoing Game past its start", () => {
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    assert.equal(formatHeroCountdown("ongoing", start, now), "Starting now");
  });

  it("stays null for an upcoming Game that somehow has no future start", () => {
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    assert.equal(formatHeroCountdown("upcoming", start, now), null);
  });
});

describe("formatHeroKickoffTrailer", () => {
  it("composes the meridiem with an explicit end-time trailer", () => {
    const start = new Date(2026, 8, 7, 21, 0, 0);
    const end = new Date(2026, 8, 7, 22, 30, 0);
    assert.equal(formatHeroKickoffTrailer(start, end), "PM until 10:30");
  });

  it("falls back to the bare meridiem when no window end exists", () => {
    const start = new Date(2026, 8, 7, 21, 0, 0);
    assert.equal(formatHeroKickoffTrailer(start, null), "PM");
  });
});
