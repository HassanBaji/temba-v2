import { describe, expect, it } from "vitest";

import {
  refundDisplay,
  refundSource,
  settleActions,
} from "./booking-ledger-model";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

const at = (day: number, hour: number, minute = 0) =>
  zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });

describe("refundDisplay", () => {
  it("reads a refund as in progress until the Payment row changes", () => {
    const updatedAt = at(7, 12);
    expect(
      refundDisplay({ updatedAt, refundFailureReason: null }, updatedAt),
    ).toBe("in_progress");
    expect(
      refundDisplay(
        { updatedAt: at(7, 13), refundFailureReason: "Declined" },
        updatedAt,
      ),
    ).toBe("failed");
    expect(
      refundDisplay({ updatedAt, refundFailureReason: "Declined" }, null),
    ).toBe("failed");
    expect(refundDisplay({ updatedAt, refundFailureReason: null }, null)).toBe(
      "none",
    );
  });
});

describe("settleActions", () => {
  const row = (
    provider: "manual" | "tap",
    status: "pending" | "paid" | "failed",
    hour = 10,
  ) => ({ provider, status, createdAt: at(7, hour) });

  it("offers every outcome on a pending manual Payment or no Payment", () => {
    const all = { pay: true, waive: true, fail: true };
    expect(settleActions("confirmed", [])).toEqual(all);
    expect(settleActions("no_show", [row("manual", "pending")])).toEqual(all);
  });

  it("only waives a failed Tap Payment, and offers nothing once settled", () => {
    expect(settleActions("confirmed", [row("tap", "failed")])).toEqual({
      pay: false,
      waive: true,
      fail: false,
    });
    const none = { pay: false, waive: false, fail: false };
    expect(settleActions("confirmed", [row("manual", "paid")])).toEqual(none);
    expect(settleActions("confirmed", [row("tap", "pending")])).toEqual(none);
  });

  it("offers nothing on Bookings that are not awaiting settlement", () => {
    const none = { pay: false, waive: false, fail: false };
    for (const status of ["pending_payment", "expired", "cancelled"]) {
      expect(settleActions(status, [])).toEqual(none);
    }
  });

  it("reads the latest Payment", () => {
    expect(
      settleActions("confirmed", [
        row("tap", "failed", 9),
        row("manual", "paid", 11),
      ]),
    ).toEqual({ pay: false, waive: false, fail: false });
  });
});

describe("refundSource", () => {
  it("picks the paid or partly refunded row and skips the rest", () => {
    const rows = [
      { id: "a", status: "failed" as const },
      { id: "b", status: "partially_refunded" as const },
      { id: "c", status: "paid" as const },
    ];
    expect(refundSource(rows)?.id).toBe("b");
    expect(refundSource([{ id: "x", status: "waived" as const }])).toBe(
      undefined,
    );
  });
});
