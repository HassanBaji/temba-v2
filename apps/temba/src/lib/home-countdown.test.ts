import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatHomeCountdown, formatHomeKickoff } from "./home-countdown";

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
