import { describe, expect, it } from "vitest";

import { priceForInterval, type PricingRuleInput } from "./booking-price";
import { formatBookingPriceFils } from "./price-per-player";
import { zonedDateTimeToInstant } from "./product-timezone";

const COURT_A = "court-a";
const COURT_B = "court-b";
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// 2030-01-07 is a Monday, 2030-01-06 a Sunday.
function at(day: number, hour: number, minute = 0) {
  return zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });
}

function rule(patch: Partial<PricingRuleInput>): PricingRuleInput {
  return {
    courtId: null,
    weekdays: ALL_DAYS,
    startMinutes: 0,
    endMinutes: 1440,
    hourlyRateFils: 10_000,
    ...patch,
  };
}

describe("priceForInterval", () => {
  it("prices a whole hour at the hourly rate", () => {
    expect(
      priceForInterval([rule({})], {
        courtId: COURT_A,
        startsAt: at(7, 10),
        endsAt: at(7, 11),
      }),
    ).toEqual({ fils: 10_000 });
  });

  it("prices a 90-minute interval and rounds to fils", () => {
    // 90 minutes at 10001/h = 15001.5
    expect(
      priceForInterval([rule({ hourlyRateFils: 10_001 })], {
        courtId: COURT_A,
        startsAt: at(7, 10),
        endsAt: at(7, 11, 30),
      }),
    ).toEqual({ fils: 15_002 });
  });

  it("prices the whole interval at the rate of the band it starts in", () => {
    const rules = [
      rule({ startMinutes: 0, endMinutes: 17 * 60, hourlyRateFils: 10_000 }),
      rule({ startMinutes: 17 * 60, endMinutes: 1440, hourlyRateFils: 16_000 }),
    ];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 16, 30),
        endsAt: at(7, 18),
      }),
    ).toEqual({ fils: 15_000 });
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 17),
        endsAt: at(7, 18, 30),
      }),
    ).toEqual({ fils: 24_000 });
  });

  it("lets a Court rule override a Venue rule for that Court only", () => {
    const rules = [
      rule({ hourlyRateFils: 10_000 }),
      rule({ courtId: COURT_A, hourlyRateFils: 20_000 }),
    ];
    const interval = { startsAt: at(7, 10), endsAt: at(7, 11) };
    expect(priceForInterval(rules, { courtId: COURT_A, ...interval })).toEqual({
      fils: 20_000,
    });
    expect(priceForInterval(rules, { courtId: COURT_B, ...interval })).toEqual({
      fils: 10_000,
    });
  });

  it("falls back to the Venue rule when no Court rule covers the start", () => {
    const rules = [
      rule({ hourlyRateFils: 10_000 }),
      rule({
        courtId: COURT_A,
        startMinutes: 11 * 60,
        endMinutes: 12 * 60,
        hourlyRateFils: 20_000,
      }),
    ];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 10, 30),
        endsAt: at(7, 11, 30),
      }),
    ).toEqual({ fils: 10_000 });
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 11, 30),
        endsAt: at(7, 12, 30),
      }),
    ).toEqual({ fils: 20_000 });
  });

  it("ignores another Court's rules", () => {
    expect(
      priceForInterval([rule({ courtId: COURT_B })], {
        courtId: COURT_A,
        startsAt: at(7, 10),
        endsAt: at(7, 11),
      }),
    ).toEqual({ uncovered: true });
  });

  it("prices an interval that runs past the end of its band", () => {
    const rules = [rule({ startMinutes: 8 * 60, endMinutes: 12 * 60 })];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 11, 30),
        endsAt: at(7, 12, 30),
      }),
    ).toEqual({ fils: 10_000 });
  });

  it("returns uncovered when no rule covers the start", () => {
    const rules = [rule({ startMinutes: 8 * 60, endMinutes: 12 * 60 })];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 12),
        endsAt: at(7, 13),
      }),
    ).toEqual({ uncovered: true });
  });

  it("returns uncovered on a weekday the rule does not include", () => {
    const rules = [rule({ weekdays: [1] })];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(8, 10),
        endsAt: at(8, 11),
      }),
    ).toEqual({ uncovered: true });
  });

  it("returns uncovered for an empty interval", () => {
    expect(
      priceForInterval([rule({})], {
        courtId: COURT_A,
        startsAt: at(7, 10),
        endsAt: at(7, 10),
      }),
    ).toEqual({ uncovered: true });
  });

  it("prices a window crossing midnight on the opening weekday", () => {
    // Sunday-only rule from 22:00 to 02:00 the next day (minutes 1320–1560).
    const rules = [
      rule({
        weekdays: [0],
        startMinutes: 22 * 60,
        endMinutes: 26 * 60,
        hourlyRateFils: 12_000,
      }),
    ];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(6, 23),
        endsAt: at(7, 1),
      }),
    ).toEqual({ fils: 24_000 });
    // Monday 00:00 belongs to Sunday's window; Monday 23:00 does not.
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(7, 23),
        endsAt: at(8, 1),
      }),
    ).toEqual({ uncovered: true });
  });

  it("prices across midnight at the rule of the day it starts on", () => {
    const rules = [
      rule({ weekdays: [0], hourlyRateFils: 10_000 }),
      rule({ weekdays: [1], hourlyRateFils: 20_000 }),
    ];
    expect(
      priceForInterval(rules, {
        courtId: COURT_A,
        startsAt: at(6, 23),
        endsAt: at(7, 1),
      }),
    ).toEqual({ fils: 20_000 });
  });
});

describe("formatBookingPriceFils", () => {
  it("shows three decimals and the currency", () => {
    expect(formatBookingPriceFils(21_004)).toBe("21.004 BD");
    expect(formatBookingPriceFils(0)).toBe("0.000 BD");
  });
});
