import { describe, expect, it } from "vitest";

import type { PricingRuleInput } from "./booking-price";
import {
  evaluateSlot,
  isOccupyingBooking,
  managerDurationOptions,
  slotsForDay,
  type SlotBooking,
  type SlotInput,
} from "./booking-slots";
import { zonedDateTimeToInstant } from "./product-timezone";

const COURT_A = "court-a";
const COURT_B = "court-b";
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// 2030-01-07 is a Monday (weekday 1).
function at(day: number, hour: number, minute = 0) {
  return zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });
}

const baseRule: PricingRuleInput = {
  courtId: null,
  weekdays: ALL_DAYS,
  startMinutes: 0,
  endMinutes: 1440,
  hourlyRateFils: 10_000,
};

function input(patch: Partial<SlotInput> = {}): SlotInput {
  return {
    courts: [{ id: COURT_A }],
    openingHours: [
      { weekday: 1, opensAtMinutes: 8 * 60, closesAtMinutes: 12 * 60 },
    ],
    closures: [],
    rules: [baseRule],
    bookings: [],
    settings: {
      slotMinutes: 30,
      durationOptionsMinutes: [60, 90],
      bookingHorizonDays: 14,
      minLeadMinutes: 60,
    },
    now: at(5, 12),
    ...patch,
  };
}

function booking(patch: Partial<SlotBooking>): SlotBooking {
  return {
    courtId: COURT_A,
    startsAt: at(7, 9),
    endsAt: at(7, 10),
    status: "confirmed",
    holdExpiresAt: null,
    ...patch,
  };
}

const day = (value: SlotInput) => slotsForDay(value, "2030-01-07")[0]!.slots;

describe("slotsForDay", () => {
  it("lists every grid start with the durations that fit before closing", () => {
    const slots = day(input());
    expect(slots[0]).toEqual({
      startsAt: at(7, 8),
      durations: [
        { minutes: 60, priceFils: 10_000 },
        { minutes: 90, priceFils: 15_000 },
      ],
    });
    expect(slots.at(-2)?.startsAt).toEqual(at(7, 10, 30));
    expect(slots.at(-2)?.durations).toEqual([
      { minutes: 60, priceFils: 10_000 },
      { minutes: 90, priceFils: 15_000 },
    ]);
    expect(slots.at(-1)?.startsAt).toEqual(at(7, 11));
    expect(slots.at(-1)?.durations).toEqual([
      { minutes: 60, priceFils: 10_000 },
    ]);
    expect(slots).toHaveLength(7);
  });

  it("is empty on a weekday without Opening hours", () => {
    expect(slotsForDay(input(), "2030-01-08")[0]!.slots).toEqual([]);
  });

  it("omits starts before now plus the minimum lead", () => {
    const slots = day(input({ now: at(7, 8, 30) }));
    expect(slots[0]?.startsAt).toEqual(at(7, 9, 30));
  });

  it("omits starts at or beyond the horizon", () => {
    const value = input({
      now: at(6, 12),
      settings: {
        slotMinutes: 30,
        durationOptionsMinutes: [60],
        bookingHorizonDays: 1,
        minLeadMinutes: 0,
      },
    });
    expect(day(value)).toEqual([]);
    expect(
      slotsForDay({ ...value, now: at(7, 0) }, "2030-01-07")[0]!.slots.length,
    ).toBeGreaterThan(0);
  });

  it("leaves a gap for a whole-Venue Closure and only the closed Court for a Court Closure", () => {
    const value = input({
      courts: [{ id: COURT_A }, { id: COURT_B }],
      closures: [{ courtId: COURT_A, startsAt: at(7, 9), endsAt: at(7, 10) }],
    });
    const [a, b] = slotsForDay(value, "2030-01-07");
    expect(a!.slots.map((slot) => slot.startsAt)).not.toContainEqual(at(7, 9));
    expect(a!.slots.map((slot) => slot.startsAt)).not.toContainEqual(
      at(7, 8, 30),
    );
    expect(a!.slots.map((slot) => slot.startsAt)).toContainEqual(at(7, 8));
    expect(b!.slots.map((slot) => slot.startsAt)).toContainEqual(at(7, 9));

    const whole = slotsForDay(
      input({
        courts: [{ id: COURT_A }, { id: COURT_B }],
        closures: [{ courtId: null, startsAt: at(7, 0), endsAt: at(8, 0) }],
      }),
      "2030-01-07",
    );
    expect(whole.every((court) => court.slots.length === 0)).toBe(true);
  });

  it("drops starts and durations that run into an occupying Booking", () => {
    const slots = day(input({ bookings: [booking({})] }));
    const starts = slots.map((slot) => slot.startsAt);
    expect(starts).not.toContainEqual(at(7, 9));
    expect(starts).not.toContainEqual(at(7, 9, 30));
    expect(starts).not.toContainEqual(at(7, 8, 30));
    expect(slots[0]?.startsAt).toEqual(at(7, 8));
    expect(slots[0]?.durations).toEqual([{ minutes: 60, priceFils: 10_000 }]);
    expect(starts).toContainEqual(at(7, 10));
  });

  it("does not let cancelled, no-show, expired or lapsed holds block", () => {
    const now = at(5, 12);
    const free = day(input()).length;
    for (const blocking of [
      booking({ status: "cancelled" }),
      booking({ status: "no_show" }),
      booking({ status: "expired" }),
      booking({
        status: "pending_payment",
        holdExpiresAt: new Date(now.getTime() - 1),
      }),
    ]) {
      expect(day(input({ bookings: [blocking] }))).toHaveLength(free);
    }
    expect(
      day(
        input({
          bookings: [
            booking({
              status: "pending_payment",
              holdExpiresAt: new Date(now.getTime() + 60_000),
            }),
          ],
        }),
      ).length,
    ).toBeLessThan(free);
  });

  it("offers only the durations the Venue lists and prices them at the start's rule", () => {
    const value = input({
      settings: {
        slotMinutes: 60,
        durationOptionsMinutes: [120],
        bookingHorizonDays: 14,
        minLeadMinutes: 60,
      },
      rules: [
        {
          ...baseRule,
          startMinutes: 0,
          endMinutes: 9 * 60,
          hourlyRateFils: 8_000,
        },
        {
          ...baseRule,
          startMinutes: 9 * 60,
          endMinutes: 1440,
          hourlyRateFils: 12_000,
        },
      ],
    });
    expect(day(value)[0]).toEqual({
      startsAt: at(7, 8),
      durations: [{ minutes: 120, priceFils: 16_000 }],
    });
  });

  it("omits starts that no Pricing rule covers", () => {
    const slots = day(
      input({
        rules: [{ ...baseRule, startMinutes: 9 * 60, endMinutes: 1440 }],
      }),
    );
    expect(slots[0]?.startsAt).toEqual(at(7, 9));
  });

  it("lists late starts of a window past midnight under the day it opened", () => {
    const value = input({
      openingHours: [
        { weekday: 1, opensAtMinutes: 22 * 60, closesAtMinutes: 26 * 60 },
      ],
    });
    const starts = day(value).map((slot) => slot.startsAt);
    expect(starts).toContainEqual(at(8, 0, 30));
    expect(starts).toContainEqual(at(8, 1));
    expect(starts).not.toContainEqual(at(8, 1, 30));
  });

  it("serves a split day", () => {
    const value = input({
      openingHours: [
        { weekday: 1, opensAtMinutes: 14 * 60, closesAtMinutes: 15 * 60 },
        { weekday: 1, opensAtMinutes: 8 * 60, closesAtMinutes: 9 * 60 },
      ],
    });
    expect(day(value).map((slot) => slot.startsAt)).toEqual([
      at(7, 8),
      at(7, 14),
    ]);
  });
});

describe("evaluateSlot", () => {
  const candidate = (
    startsAt: Date,
    durationMinutes = 60,
    courtId = COURT_A,
  ) => ({
    courtId,
    startsAt,
    durationMinutes,
  });

  it("accepts a good slot with its price", () => {
    expect(evaluateSlot(input(), candidate(at(7, 9)))).toEqual({
      ok: true,
      priceFils: 10_000,
    });
  });

  it.each([
    ["bad_duration", input(), candidate(at(7, 9), 45)],
    ["off_grid", input(), candidate(at(7, 9, 15))],
    ["too_soon", input({ now: at(7, 8, 30) }), candidate(at(7, 9))],
    ["too_far", input({ now: at(7, 8, 30) }), candidate(at(7 + 14, 9))],
    ["outside_hours", input(), candidate(at(7, 11, 30))],
    ["outside_hours", input(), candidate(at(7, 7))],
    ["outside_hours", input(), candidate(at(8, 9))],
    [
      "closure",
      input({
        closures: [
          { courtId: null, startsAt: at(7, 9, 30), endsAt: at(7, 10) },
        ],
      }),
      candidate(at(7, 9)),
    ],
    ["no_price", input({ rules: [] }), candidate(at(7, 9))],
    ["taken", input({ bookings: [booking({})] }), candidate(at(7, 9, 30))],
  ] as const)("refuses as %s", (reason, value, slot) => {
    expect(evaluateSlot(value, slot)).toEqual({ ok: false, reason });
  });

  it("allows back-to-back Bookings", () => {
    expect(
      evaluateSlot(input({ bookings: [booking({})] }), candidate(at(7, 10))).ok,
    ).toBe(true);
    expect(
      evaluateSlot(input({ bookings: [booking({})] }), candidate(at(7, 8))).ok,
    ).toBe(true);
  });

  it("does not let a Booking on another Court block", () => {
    expect(
      evaluateSlot(
        input({ bookings: [booking({ courtId: COURT_B })] }),
        candidate(at(7, 9)),
      ).ok,
    ).toBe(true);
  });

  it("accepts a 01:00 start inside the previous day's overnight window", () => {
    const value = input({
      openingHours: [
        { weekday: 1, opensAtMinutes: 22 * 60, closesAtMinutes: 26 * 60 },
      ],
    });
    expect(evaluateSlot(value, candidate(at(8, 1))).ok).toBe(true);
    expect(evaluateSlot(value, candidate(at(8, 1, 30))).ok).toBe(false);
  });
});

describe("evaluateSlot under manager limits", () => {
  const candidate = (startsAt: Date, durationMinutes = 60) => ({
    courtId: COURT_A,
    startsAt,
    durationMinutes,
  });

  it("ignores the lead and the horizon", () => {
    const value = input({ now: at(7, 8, 30) });
    expect(evaluateSlot(value, candidate(at(7, 9)), "manager").ok).toBe(true);
    expect(
      evaluateSlot(
        input({
          now: at(7, 8, 30),
          openingHours: ALL_DAYS.map((weekday) => ({
            weekday,
            opensAtMinutes: 8 * 60,
            closesAtMinutes: 12 * 60,
          })),
        }),
        candidate(at(7 + 30, 9)),
        "manager",
      ).ok,
    ).toBe(true);
  });

  it("accepts a slot already under way and refuses one that has ended", () => {
    const value = input({ now: at(7, 9, 30) });
    expect(evaluateSlot(value, candidate(at(7, 9)), "manager").ok).toBe(true);
    expect(evaluateSlot(value, candidate(at(7, 8, 30)), "manager")).toEqual({
      ok: false,
      reason: "ended",
    });
  });

  it("takes any multiple of the grid step up to four hours", () => {
    expect(evaluateSlot(input(), candidate(at(7, 8), 150), "manager")).toEqual({
      ok: true,
      priceFils: 25_000,
    });
    expect(evaluateSlot(input(), candidate(at(7, 8), 45), "manager")).toEqual({
      ok: false,
      reason: "bad_duration",
    });
    expect(managerDurationOptions(60)).toEqual([60, 120, 180, 240]);
  });

  it("still refuses Closures, unpriced and taken time", () => {
    expect(
      evaluateSlot(
        input({ bookings: [booking({})] }),
        candidate(at(7, 9)),
        "manager",
      ),
    ).toEqual({ ok: false, reason: "taken" });
    expect(
      evaluateSlot(input({ rules: [] }), candidate(at(7, 9)), "manager"),
    ).toEqual({ ok: false, reason: "no_price" });
  });
});

describe("isOccupyingBooking", () => {
  const now = at(5, 12);
  it("blocks confirmed and live holds only", () => {
    expect(
      isOccupyingBooking({ status: "confirmed", holdExpiresAt: null }, now),
    ).toBe(true);
    expect(
      isOccupyingBooking(
        {
          status: "pending_payment",
          holdExpiresAt: new Date(now.getTime() + 1),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isOccupyingBooking(
        { status: "pending_payment", holdExpiresAt: now },
        now,
      ),
    ).toBe(false);
    for (const status of ["cancelled", "no_show", "expired"] as const) {
      expect(isOccupyingBooking({ status, holdExpiresAt: null }, now)).toBe(
        false,
      );
    }
  });
});
