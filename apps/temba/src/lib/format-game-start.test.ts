import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  APP_LOCALE,
  formatAbsoluteDay,
  formatDayMonth,
  formatGameCardDay,
  formatGameClock,
  formatGameClockWithoutMeridiem,
  formatGameStart,
  formatPlayedRelativeDay,
  formatRelativeDay,
  formatWindowDuration,
} from "./format-game-start";

// Local-time constructors keep these independent of the machine's timezone.
const SATURDAY_EVENING = new Date(2026, 9, 3, 19, 30, 0);

describe("APP_LOCALE", () => {
  it("is the one locale every date and time uses", () => {
    assert.equal(APP_LOCALE, "en-US");
  });
});

describe("formatGameClock", () => {
  it("uses a 12-hour clock whatever the viewer's locale", () => {
    assert.match(formatGameClock(SATURDAY_EVENING), /^7:30\sPM$/u);
  });
});

describe("formatDayMonth", () => {
  it("puts the day before a short month by default", () => {
    assert.equal(formatDayMonth(SATURDAY_EVENING), "3 Oct");
  });

  it("adds a weekday and year when asked", () => {
    assert.equal(
      formatDayMonth(SATURDAY_EVENING, { weekday: "short", year: true }),
      "Sat 3 Oct 2026",
    );
  });

  it("spells out weekday and month for detail headings", () => {
    assert.equal(formatAbsoluteDay(SATURDAY_EVENING), "Saturday 3 October");
  });
});

describe("formatGameStart", () => {
  it("joins the short day and the clock", () => {
    assert.match(formatGameStart(SATURDAY_EVENING), /^Sat 3 Oct, 7:30\sPM$/u);
  });
});

describe("formatRelativeDay", () => {
  it("falls back to a short day-first date beyond tomorrow", () => {
    const date = new Date(2099, 0, 15, 20, 0, 0);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    assert.equal(formatRelativeDay(date), `${weekday} 15 Jan`);
  });
});

describe("formatWindowDuration", () => {
  it("returns null when either bound is missing", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    assert.equal(formatWindowDuration(null, start), null);
    assert.equal(formatWindowDuration(start, null), null);
  });

  it("formats a 90-minute window in words", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    const end = new Date("2026-09-07T19:30:00.000Z");
    assert.equal(formatWindowDuration(start, end), "90 minutes");
  });

  it("keeps a one-minute window singular", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    const end = new Date("2026-09-07T18:01:00.000Z");
    assert.equal(formatWindowDuration(start, end), "1 minute");
  });
});

describe("formatGameCardDay", () => {
  it("uses Today on the same local day", () => {
    assert.equal(formatGameCardDay(new Date()), "Today");
  });

  it("formats later days as weekday day month", () => {
    const date = new Date(2099, 0, 15, 20, 0, 0);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    assert.equal(formatGameCardDay(date), `${weekday} 15 Jan`);
  });
});

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
