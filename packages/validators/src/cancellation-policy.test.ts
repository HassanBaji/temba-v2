import { describe, expect, it } from "vitest";

import {
  CANCELLATION_POLICY_PRESETS,
  cancellationPolicySchema,
  type CancellationPolicy,
} from "./cancellation-policy";

const base: CancellationPolicy = {
  tiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 12, refundPercent: 50 },
  ],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 60,
};

function messages(input: unknown) {
  const result = cancellationPolicySchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("cancellationPolicySchema", () => {
  it.each(CANCELLATION_POLICY_PRESETS)("round-trips the $label preset", (p) => {
    expect(
      cancellationPolicySchema.parse(JSON.parse(JSON.stringify(p.policy))),
    ).toEqual(p.policy);
  });

  it("accepts no tiers and five tiers", () => {
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [],
        lateRefundPercent: 100,
      }).success,
    ).toBe(true);
    const five = [100, 80, 60, 40, 20].map((refundPercent, i) => ({
      hoursBefore: 100 - i * 10,
      refundPercent,
    }));
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: five,
        lateRefundPercent: 0,
      }).success,
    ).toBe(true);
  });

  it("refuses six tiers", () => {
    const six = [6, 5, 4, 3, 2, 1].map((hoursBefore) => ({
      hoursBefore,
      refundPercent: 50,
    }));
    expect(messages({ ...base, tiers: six, lateRefundPercent: 0 })).toContain(
      "Use at most 5 tiers",
    );
  });

  it("refuses equal or increasing hours", () => {
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [
          { hoursBefore: 24, refundPercent: 100 },
          { hoursBefore: 24, refundPercent: 50 },
        ],
      }).success,
    ).toBe(false);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [
          { hoursBefore: 12, refundPercent: 100 },
          { hoursBefore: 24, refundPercent: 50 },
        ],
      }).success,
    ).toBe(false);
  });

  it("refuses a later tier that refunds more, but allows equal percents", () => {
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [
          { hoursBefore: 48, refundPercent: 50 },
          { hoursBefore: 12, refundPercent: 80 },
        ],
      }).success,
    ).toBe(false);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [
          { hoursBefore: 48, refundPercent: 50 },
          { hoursBefore: 12, refundPercent: 50 },
        ],
        lateRefundPercent: 50,
      }).success,
    ).toBe(true);
  });

  it("refuses percents outside 0-100 and non-integers", () => {
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [],
        lateRefundPercent: 101,
      }).success,
    ).toBe(false);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [],
        lateRefundPercent: -1,
      }).success,
    ).toBe(false);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        tiers: [],
        lateRefundPercent: 50.5,
      }).success,
    ).toBe(false);
  });

  it("bounds customerCancelUntilMinutes to 0-1440", () => {
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        customerCancelUntilMinutes: 0,
      }).success,
    ).toBe(true);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        customerCancelUntilMinutes: 1440,
      }).success,
    ).toBe(true);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        customerCancelUntilMinutes: 1441,
      }).success,
    ).toBe(false);
    expect(
      cancellationPolicySchema.safeParse({
        ...base,
        customerCancelUntilMinutes: -1,
      }).success,
    ).toBe(false);
  });
});
