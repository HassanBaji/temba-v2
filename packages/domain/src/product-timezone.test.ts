import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import {
  formatAbsoluteDay,
  formatGameClock,
  formatGameStart,
} from "./format-game-start";
import {
  earliestGameWindowDay,
  formatDateInputValue,
  parseGameDateTime,
  splitGameWindow,
} from "./game-window";
import { formatRequestedAt } from "./request-meta";
import {
  addProductDays,
  PRODUCT_TIMEZONE,
  productDayKey,
  productDaysBetween,
  startOfProductDay,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";
import { tournamentRoundSummary } from "./tournament-rounds";
import { isOneDayTournamentWindow } from "./tournament-schedule";

const PROCESS_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "Pacific/Auckland",
  "Asia/Bahrain",
];

const originalTimezone = process.env.TZ;

afterEach(() => {
  if (originalTimezone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimezone;
  }
});

function underEveryProcessTimezone<T>(compute: () => T): T[] {
  return PROCESS_TIMEZONES.map((timezone) => {
    process.env.TZ = timezone;
    return compute();
  });
}

function assertIdenticalEverywhere(compute: () => unknown) {
  const [first, ...rest] = underEveryProcessTimezone(compute);
  for (const other of rest) {
    assert.deepEqual(other, first);
  }
  return first;
}

const LATE_EVENING = new Date("2026-10-03T20:30:00.000Z");
const NOW = new Date("2026-10-10T06:00:00.000Z");

describe("product timezone", () => {
  it("is Asia/Bahrain", () => {
    assert.equal(PRODUCT_TIMEZONE, "Asia/Bahrain");
  });

  it("reads 23:30 Bahrain time as the same day and time whatever the process timezone", () => {
    const text = assertIdenticalEverywhere(() => [
      formatGameStart(LATE_EVENING),
      formatAbsoluteDay(LATE_EVENING),
      formatGameClock(LATE_EVENING),
      formatDateInputValue(LATE_EVENING),
      splitGameWindow(LATE_EVENING, LATE_EVENING),
    ]);
    assert.deepEqual(text, [
      "Sat 3 Oct, 11:30 PM",
      "Saturday 3 October",
      "11:30 PM",
      "2026-10-03",
      { day: "2026-10-03", startTime: "23:30", finishTime: "23:30" },
    ]);
  });

  it("turns the picked day and time into the Bahrain wall clock instant", () => {
    const instant = assertIdenticalEverywhere(() =>
      parseGameDateTime("2026-10-03", "23:30")?.toISOString(),
    );
    assert.equal(instant, "2026-10-03T20:30:00.000Z");
  });

  it("round-trips zoned parts and rejects nothing it can represent", () => {
    const instant = zonedDateTimeToInstant({
      year: 2026,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
      second: 58,
    });
    assert.deepEqual(zonedParts(instant), {
      year: 2026,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
      second: 58,
    });
    assert.equal(productDayKey(addProductDays(instant, 1)), "2027-01-01");
  });

  it("splits a two-day window at Bahrain midnight", () => {
    const beforeMidnight = new Date("2026-10-03T20:59:00.000Z");
    const afterMidnight = new Date("2026-10-03T21:01:00.000Z");
    const result = assertIdenticalEverywhere(() => [
      isOneDayTournamentWindow(beforeMidnight, afterMidnight),
      tournamentRoundSummary({
        roundCount: 2,
        windowStart: beforeMidnight,
        windowEnd: new Date("2026-10-03T21:30:00.000Z"),
        matchMinutes: 20,
      })?.dateLines,
    ]);
    assert.deepEqual(result, [
      false,
      ["Saturday 3 October", "Sunday 4 October"],
    ]);
  });

  it("keeps a window inside one Bahrain day as one day", () => {
    const result = assertIdenticalEverywhere(() =>
      isOneDayTournamentWindow(
        new Date("2026-10-02T21:00:00.000Z"),
        new Date("2026-10-03T20:59:00.000Z"),
      ),
    );
    assert.equal(result, true);
  });

  it("computes today, tomorrow and days ago on Bahrain days", () => {
    const result = assertIdenticalEverywhere(() => [
      productDaysBetween(
        new Date("2026-10-10T20:59:00.000Z"),
        new Date("2026-10-10T21:01:00.000Z"),
      ),
      startOfProductDay(NOW).toISOString(),
      formatRequestedAt(new Date("2026-10-09T20:59:00.000Z"), NOW),
      formatRequestedAt(new Date("2026-10-08T21:30:00.000Z"), NOW),
      earliestGameWindowDay(new Date("2026-10-10T20:50:00.000Z")).toISOString(),
    ]);
    assert.deepEqual(result, [
      1,
      "2026-10-09T21:00:00.000Z",
      "Requested yesterday",
      "Requested yesterday",
      "2026-10-10T21:00:00.000Z",
    ]);
  });
});
