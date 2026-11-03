import { bahrainDate } from "./bahrain-date.test-support";
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
    assert.equal(formatHomeCountdown(start, now, "en"), "in 5h 42m");
  });

  it("drops to minutes under an hour", () => {
    const start = new Date(now.getTime() + 45 * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now, "en"), "in 45m");
  });

  it("returns null for a start that is not in the future", () => {
    assert.equal(formatHomeCountdown(now, now, "en"), null);
    assert.equal(
      formatHomeCountdown(new Date(now.getTime() - 60 * 1000), now, "en"),
      null,
    );
  });

  it("does not render in 0m for a start under a minute away", () => {
    const start = new Date(now.getTime() + 20 * 1000);
    assert.equal(formatHomeCountdown(start, now, "en"), "in 1m");
  });

  it("switches to days once a full day remains", () => {
    const start = new Date(now.getTime() + (4 * 24 * 60 + 8) * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now, "en"), "in 4 days");
  });

  it("keeps a singular day under two days", () => {
    const start = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now, "en"), "in 1 day");
  });

  it("counts down in Arabic", () => {
    const start = new Date(now.getTime() + (2 * 24 * 60 + 8) * 60 * 1000);
    assert.equal(formatHomeCountdown(start, now, "ar"), "بعد يومين");
    const soon = new Date(now.getTime() + (5 * 60 + 42) * 60 * 1000);
    assert.equal(formatHomeCountdown(soon, now, "ar"), "بعد 5 س 42 د");
  });
});

describe("formatHomeKickoff", () => {
  it("keeps time as one object with trailing meridiem", () => {
    const start = bahrainDate(2026, 8, 7, 21, 0, 0);
    const kickoff = formatHomeKickoff(start, "en");
    assert.equal(kickoff.time.includes(" "), false);
    assert.match(kickoff.meridiem, /AM|PM/i);
  });
});

describe("formatHeroCountdown", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  it("matches formatHomeCountdown while the start is in the future", () => {
    const start = new Date(now.getTime() + 45 * 60 * 1000);
    assert.equal(formatHeroCountdown("upcoming", start, now, "en"), "in 45m");
  });

  it("reads Starting now for an ongoing Game past its start", () => {
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    assert.equal(
      formatHeroCountdown("ongoing", start, now, "en"),
      "Starting now",
    );
  });

  it("stays null for an upcoming Game that somehow has no future start", () => {
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    assert.equal(formatHeroCountdown("upcoming", start, now, "en"), null);
  });
});

describe("formatHeroKickoffTrailer", () => {
  it("composes the meridiem with an explicit end-time trailer", () => {
    const start = bahrainDate(2026, 8, 7, 21, 0, 0);
    const end = bahrainDate(2026, 8, 7, 22, 30, 0);
    assert.equal(formatHeroKickoffTrailer(start, end, "en"), "PM until 10:30");
  });

  it("falls back to the bare meridiem when no window end exists", () => {
    const start = bahrainDate(2026, 8, 7, 21, 0, 0);
    assert.equal(formatHeroKickoffTrailer(start, null, "en"), "PM");
  });
});
