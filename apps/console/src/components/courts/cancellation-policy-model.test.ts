import { describe, expect, it } from "vitest";

import { cancellationPolicyLines } from "./cancellation-policy-model";

describe("cancellation policy lines", () => {
  it("writes one line per tier and one for after the last tier", () => {
    expect(
      cancellationPolicyLines({
        tiers: [
          { hoursBefore: 24, refundPercent: 100 },
          { hoursBefore: 6, refundPercent: 50 },
        ],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 0,
      }),
    ).toEqual([
      { label: "More than 24h before", value: "Full refund" },
      { label: "6 to 24h before", value: "50% refund" },
      { label: "Under 6h", value: "No refund" },
    ]);
  });

  it("covers a policy without tiers", () => {
    expect(
      cancellationPolicyLines({
        tiers: [],
        lateRefundPercent: 100,
        customerCancelUntilMinutes: 0,
      }),
    ).toEqual([{ label: "Any time", value: "Full refund" }]);
  });

  it("adds the in-app cancellation cut-off when there is one", () => {
    expect(
      cancellationPolicyLines({
        tiers: [{ hoursBefore: 24, refundPercent: 100 }],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 30,
      }),
    ).toContainEqual({
      label: "Cancel in the app",
      value: "Until 30 min before",
    });
    expect(
      cancellationPolicyLines({
        tiers: [],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 120,
      }),
    ).toContainEqual({ label: "Cancel in the app", value: "Until 2h before" });
  });
});
