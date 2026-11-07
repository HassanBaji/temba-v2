import { bahrainDate, bahrainDayFromToday } from "./bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

import {
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
const SATURDAY_EVENING = bahrainDate(2026, 9, 3, 19, 30, 0);

describe("formatGameClock", () => {
  it("uses a 12-hour clock whatever the viewer's locale", () => {
    assert.match(formatGameClock(SATURDAY_EVENING, "en"), /^7:30\sPM$/u);
  });

  it("keeps Latin digits and a 12-hour clock in Arabic", () => {
    assert.match(formatGameClock(SATURDAY_EVENING, "ar"), /^7:30\sم$/u);
  });

  it("turns Arabic-Indic digits from Intl into Latin ones", () => {
    const spy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValue("٧:٣٠ م");
    try {
      assert.equal(formatGameClock(SATURDAY_EVENING, "ar"), "7:30 م");
      assert.equal(spy.mock.calls[0]?.[1]?.numberingSystem, "latn");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("formatDayMonth", () => {
  it("puts the day before a short month by default", () => {
    assert.equal(formatDayMonth(SATURDAY_EVENING, "en"), "3 Oct");
  });

  it("adds a weekday and year when asked", () => {
    assert.equal(
      formatDayMonth(SATURDAY_EVENING, "en", { weekday: "short", year: true }),
      "Sat 3 Oct 2026",
    );
  });

  it("spells out weekday and month for detail headings", () => {
    assert.equal(
      formatAbsoluteDay(SATURDAY_EVENING, "en"),
      "Saturday 3 October",
    );
  });

  it("takes Arabic weekday and month names from Intl", () => {
    assert.equal(formatAbsoluteDay(SATURDAY_EVENING, "ar"), "السبت 3 أكتوبر");
  });
});

describe("formatGameStart", () => {
  it("joins the short day and the clock", () => {
    assert.match(
      formatGameStart(SATURDAY_EVENING, "en"),
      /^Sat 3 Oct, 7:30\sPM$/u,
    );
  });
});

describe("formatRelativeDay", () => {
  it("falls back to a short day-first date beyond tomorrow", () => {
    const date = bahrainDate(2099, 0, 15, 20, 0, 0);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    assert.equal(formatRelativeDay(date, "en"), `${weekday} 15 Jan`);
  });

  it("says tomorrow in Arabic", () => {
    assert.equal(formatRelativeDay(bahrainDayFromToday(1), "ar"), "غدًا");
  });
});

describe("formatWindowDuration", () => {
  it("returns null when either bound is missing", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    assert.equal(formatWindowDuration(null, start, "en"), null);
    assert.equal(formatWindowDuration(start, null, "en"), null);
  });

  it("formats a 90-minute window in words", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    const end = new Date("2026-09-07T19:30:00.000Z");
    assert.equal(formatWindowDuration(start, end, "en"), "90 minutes");
    assert.equal(formatWindowDuration(start, end, "ar"), "90 دقيقة");
  });

  it("keeps a one-minute window singular", () => {
    const start = new Date("2026-09-07T18:00:00.000Z");
    const end = new Date("2026-09-07T18:01:00.000Z");
    assert.equal(formatWindowDuration(start, end, "en"), "1 minute");
  });
});

describe("formatGameCardDay", () => {
  it("uses Today on the same local day", () => {
    assert.equal(formatGameCardDay(new Date(), "en"), "Today");
  });

  it("formats later days as weekday day month", () => {
    const date = bahrainDate(2099, 0, 15, 20, 0, 0);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    assert.equal(formatGameCardDay(date, "en"), `${weekday} 15 Jan`);
  });
});

describe("formatGameClockWithoutMeridiem", () => {
  it("drops the trailing AM/PM", () => {
    const time = bahrainDate(2026, 8, 7, 22, 30, 0);
    assert.equal(formatGameClockWithoutMeridiem(time, "en"), "10:30");
    assert.equal(formatGameClockWithoutMeridiem(time, "ar"), "10:30");
  });
});

describe("formatPlayedRelativeDay", () => {
  it("reads as today for a start earlier the same local day", () => {
    const today = bahrainDayFromToday(0, 1);
    assert.equal(formatPlayedRelativeDay(today, "en"), "Played today");
  });

  it("counts a midnight start as the evening before", () => {
    const midnight = bahrainDayFromToday(0, 0);
    assert.equal(formatPlayedRelativeDay(midnight, "en"), "Played 1 day ago");
  });

  it("keeps a singular day for yesterday", () => {
    const yesterday = bahrainDayFromToday(-1);
    assert.equal(formatPlayedRelativeDay(yesterday, "en"), "Played 1 day ago");
  });

  it("pluralizes multiple days ago", () => {
    const past = bahrainDayFromToday(-5);
    assert.equal(formatPlayedRelativeDay(past, "en"), "Played 5 days ago");
    assert.equal(formatPlayedRelativeDay(past, "ar"), "لُعبت قبل 5 أيام");
  });
});
