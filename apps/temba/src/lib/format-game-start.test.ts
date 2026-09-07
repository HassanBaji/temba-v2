import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  formatGameClockWithoutMeridiem,
  formatPlayedRelativeDay,
} from "./format-game-start";

describe("formatGameClockWithoutMeridiem", () => {
  it("drops the trailing AM/PM", () => {
    const time = new Date(2026, 8, 7, 22, 30, 0);
    assert.equal(formatGameClockWithoutMeridiem(time), "10:30");
  });
});

describe("formatPlayedRelativeDay", () => {
  it("reads as today for a start earlier the same local day", () => {
    const today = new Date();
    today.setHours(today.getHours() > 1 ? today.getHours() - 1 : 0, 0, 0, 0);
    assert.equal(formatPlayedRelativeDay(today), "Played today");
  });

  it("keeps a singular day for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    assert.equal(formatPlayedRelativeDay(yesterday), "Played 1 day ago");
  });

  it("pluralizes multiple days ago", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    assert.equal(formatPlayedRelativeDay(past), "Played 5 days ago");
  });
});
