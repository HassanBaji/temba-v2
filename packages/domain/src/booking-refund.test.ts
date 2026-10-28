import { describe, expect, it } from "vitest";

import {
  customerMayCancelAt,
  describeCancellationPolicy,
  nextRefundStep,
  refundForCancellation,
  refundPercentAt,
  type RefundPolicy,
} from "./booking-refund";

const HOUR = 60 * 60 * 1000;
const startsAt = new Date("2026-11-10T16:00:00Z");
const before = (hours: number) => new Date(startsAt.getTime() - hours * HOUR);

const full24: RefundPolicy = {
  tiers: [{ hoursBefore: 24, refundPercent: 100 }],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 0,
};
const tiered: RefundPolicy = {
  tiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 12, refundPercent: 50 },
  ],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 0,
};
const alwaysFree: RefundPolicy = {
  tiers: [],
  lateRefundPercent: 100,
  customerCancelUntilMinutes: 0,
};

describe("refundPercentAt", () => {
  it.each([
    [100, 100],
    [24.01, 100],
    [24, 100],
    [23.99, 0],
    [1, 0],
    [-2, 0],
  ])("single tier at %s h before gives %s", (hours, expected) => {
    expect(refundPercentAt(full24, startsAt, before(hours))).toBe(expected);
  });

  it.each([
    [72, 100],
    [48, 100],
    [47.99, 50],
    [12, 50],
    [11.99, 0],
  ])(
    "two tiers at %s h before gives %s (boundary is the earlier tier)",
    (hours, expected) => {
      expect(refundPercentAt(tiered, startsAt, before(hours))).toBe(expected);
    },
  );

  it("uses lateRefundPercent after the last tier", () => {
    const policy = { ...tiered, lateRefundPercent: 25 };
    expect(refundPercentAt(policy, startsAt, before(1))).toBe(25);
  });

  it("is always free with no tiers and late 100", () => {
    expect(refundPercentAt(alwaysFree, startsAt, before(500))).toBe(100);
    expect(refundPercentAt(alwaysFree, startsAt, before(0))).toBe(100);
  });
});

describe("refundForCancellation", () => {
  it("refunds the paid amount fully inside the first tier", () => {
    expect(
      refundForCancellation({
        policy: full24,
        startsAt,
        now: before(30),
        priceFils: 12000,
        paidFils: 12000,
      }),
    ).toEqual({
      percent: 100,
      refundDueFils: 12000,
      cancellationChargeFils: 0,
      tierIndex: 0,
    });
  });

  it("refunds nothing and reports the charge when late", () => {
    expect(
      refundForCancellation({
        policy: full24,
        startsAt,
        now: before(2),
        priceFils: 12000,
        paidFils: 12000,
      }),
    ).toEqual({
      percent: 0,
      refundDueFils: 0,
      cancellationChargeFils: 12000,
      tierIndex: null,
    });
  });

  it("reports the tier index at the exact boundary", () => {
    const result = refundForCancellation({
      policy: tiered,
      startsAt,
      now: before(48),
      priceFils: 10000,
      paidFils: 10000,
    });
    expect(result.tierIndex).toBe(0);
    expect(result.percent).toBe(100);
    const second = refundForCancellation({
      policy: tiered,
      startsAt,
      now: before(12),
      priceFils: 10000,
      paidFils: 10000,
    });
    expect(second.tierIndex).toBe(1);
    expect(second.refundDueFils).toBe(5000);
    expect(second.cancellationChargeFils).toBe(5000);
  });

  it("gives refundDueFils 0 but a non-zero charge when nothing was paid", () => {
    expect(
      refundForCancellation({
        policy: tiered,
        startsAt,
        now: before(20),
        priceFils: 9000,
        paidFils: 0,
      }),
    ).toEqual({
      percent: 50,
      refundDueFils: 0,
      cancellationChargeFils: 4500,
      tierIndex: 1,
    });
  });

  it("rounds to whole fils", () => {
    const policy: RefundPolicy = {
      tiers: [{ hoursBefore: 1, refundPercent: 33 }],
      lateRefundPercent: 0,
      customerCancelUntilMinutes: 0,
    };
    const result = refundForCancellation({
      policy,
      startsAt,
      now: before(5),
      priceFils: 1001,
      paidFils: 1001,
    });
    expect(result.refundDueFils).toBe(330);
    expect(result.cancellationChargeFils).toBe(671);
    const half = refundForCancellation({
      policy: { ...policy, tiers: [{ hoursBefore: 1, refundPercent: 50 }] },
      startsAt,
      now: before(5),
      priceFils: 5,
      paidFils: 5,
    });
    expect(half.refundDueFils).toBe(3);
    expect(half.cancellationChargeFils).toBe(2);
  });

  it("charges nothing when always free", () => {
    expect(
      refundForCancellation({
        policy: alwaysFree,
        startsAt,
        now: before(1),
        priceFils: 8000,
        paidFils: 8000,
      }),
    ).toEqual({
      percent: 100,
      refundDueFils: 8000,
      cancellationChargeFils: 0,
      tierIndex: null,
    });
  });
});

describe("customerMayCancelAt", () => {
  const policy: RefundPolicy = { ...full24, customerCancelUntilMinutes: 120 };

  it("allows exactly at the limit and before", () => {
    expect(customerMayCancelAt(policy, startsAt, before(2))).toBe(true);
    expect(customerMayCancelAt(policy, startsAt, before(5))).toBe(true);
  });

  it("refuses one minute inside the limit", () => {
    expect(
      customerMayCancelAt(
        policy,
        startsAt,
        new Date(before(2).getTime() + 60_000),
      ),
    ).toBe(false);
  });

  it("allows right up to the start with a zero limit and refuses after", () => {
    expect(customerMayCancelAt(full24, startsAt, startsAt)).toBe(true);
    expect(
      customerMayCancelAt(full24, startsAt, new Date(startsAt.getTime() + 1)),
    ).toBe(false);
  });
});

describe("describeCancellationPolicy", () => {
  it("describes the 24 h preset", () => {
    expect(describeCancellationPolicy(full24)).toEqual([
      "Full refund until 24 hours before",
      "No refund after that",
    ]);
  });

  it("describes the tiered preset", () => {
    expect(describeCancellationPolicy(tiered)).toEqual([
      "Full refund until 48 hours before",
      "50% refund until 12 hours before",
      "No refund after that",
    ]);
  });

  it("describes the always free preset", () => {
    expect(describeCancellationPolicy(alwaysFree)).toEqual([
      "Free cancellation at any time",
    ]);
  });

  it("adds the late percent and the Customer cancel limit", () => {
    expect(
      describeCancellationPolicy({
        tiers: [{ hoursBefore: 1, refundPercent: 100 }],
        lateRefundPercent: 25,
        customerCancelUntilMinutes: 90,
      }),
    ).toEqual([
      "Full refund until 1 hour before",
      "25% refund after that",
      "Cancel in the app until 90 minutes before the start",
    ]);
    expect(
      describeCancellationPolicy({
        ...alwaysFree,
        customerCancelUntilMinutes: 60,
      }),
    ).toEqual([
      "Free cancellation at any time",
      "Cancel in the app until 1 hour before the start",
    ]);
  });
});

describe("nextRefundStep", () => {
  it("returns the first deadline and the percent after it", () => {
    expect(nextRefundStep(tiered, startsAt, before(60))).toEqual({
      currentPercent: 100,
      deadline: before(48),
      nextPercent: 50,
    });
  });

  it("moves to the next tier once the first boundary passes", () => {
    expect(nextRefundStep(tiered, startsAt, before(20))).toEqual({
      currentPercent: 50,
      deadline: before(12),
      nextPercent: 0,
    });
  });

  it("keeps the exact boundary in the earlier tier", () => {
    expect(nextRefundStep(full24, startsAt, before(24))).toEqual({
      currentPercent: 100,
      deadline: before(24),
      nextPercent: 0,
    });
  });

  it("is null once the late rate applies", () => {
    expect(nextRefundStep(full24, startsAt, before(3))).toBeNull();
    expect(nextRefundStep(tiered, startsAt, before(1))).toBeNull();
  });

  it("is null for an always free policy", () => {
    expect(nextRefundStep(alwaysFree, startsAt, before(100))).toBeNull();
  });

  it("skips steps that do not change the percent", () => {
    const flat: RefundPolicy = {
      tiers: [
        { hoursBefore: 48, refundPercent: 50 },
        { hoursBefore: 12, refundPercent: 50 },
      ],
      lateRefundPercent: 50,
      customerCancelUntilMinutes: 0,
    };
    expect(nextRefundStep(flat, startsAt, before(100))).toBeNull();
    const dropsLater: RefundPolicy = { ...flat, lateRefundPercent: 0 };
    expect(nextRefundStep(dropsLater, startsAt, before(100))).toEqual({
      currentPercent: 50,
      deadline: before(12),
      nextPercent: 0,
    });
  });
});
