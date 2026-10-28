import { describe, expect, it } from "vitest";

import {
  PAYMENT_HOLD_MINUTES,
  paymentHoldExpiresAt,
  paymentStateFor,
  summarisePaymentStatus,
  type PaymentStatus,
} from "./booking-payment";

const T = (minute: number) => new Date(Date.UTC(2030, 0, 1, 12, minute));

function rows(...statuses: PaymentStatus[]) {
  return statuses.map((status, index) => ({ status, createdAt: T(index) }));
}

describe("summarisePaymentStatus", () => {
  it.each<[PaymentStatus[], PaymentStatus]>([
    [[], "pending"],
    [["pending"], "pending"],
    [["paid"], "paid"],
    [["failed"], "failed"],
    [["waived"], "waived"],
    [["refunded"], "refunded"],
    [["partially_refunded"], "partially_refunded"],
    [["failed", "paid"], "paid"],
    [["failed", "pending"], "pending"],
    [["failed", "failed"], "failed"],
    [["paid", "failed"], "paid"],
    [["pending", "paid"], "paid"],
    [["paid", "partially_refunded"], "partially_refunded"],
    [["failed", "paid", "refunded"], "refunded"],
    [["failed", "waived"], "waived"],
  ])("%j summarises to %s", (statuses, expected) => {
    expect(summarisePaymentStatus(rows(...statuses))).toBe(expected);
  });

  it("orders by createdAt, not by the order given", () => {
    const shuffled = [
      { status: "paid" as const, createdAt: T(2) },
      { status: "failed" as const, createdAt: T(1) },
    ];
    expect(summarisePaymentStatus(shuffled)).toBe("paid");
  });

  it("keeps the given order for equal timestamps", () => {
    expect(
      summarisePaymentStatus([
        { status: "pending", createdAt: T(0) },
        { status: "paid", createdAt: T(0) },
      ]),
    ).toBe("paid");
  });
});

describe("paymentHoldExpiresAt", () => {
  it("is ten minutes on", () => {
    expect(PAYMENT_HOLD_MINUTES).toBe(10);
    expect(paymentHoldExpiresAt(T(0))).toEqual(T(10));
  });
});

describe("paymentStateFor", () => {
  const holding = { status: "pending_payment" as const, holdExpiresAt: T(10) };
  const tap = (patch: Partial<Parameters<typeof paymentStateFor>[1]> = {}) => ({
    provider: "tap" as const,
    status: "pending" as const,
    providerStatus: null,
    clientRedirectUrl: null,
    failureReason: null,
    ...patch,
  });

  it("is preparing until the charge has a redirect url", () => {
    expect(paymentStateFor(holding, null, T(1))).toEqual({ kind: "preparing" });
    expect(paymentStateFor(holding, tap(), T(1))).toEqual({
      kind: "preparing",
    });
  });

  it("redirects while the charge is untouched, then pends", () => {
    const withUrl = tap({
      clientRedirectUrl: "https://pay.example/x",
      providerStatus: "INITIATED",
    });
    expect(paymentStateFor(holding, withUrl, T(1))).toEqual({
      kind: "redirect",
      redirectUrl: "https://pay.example/x",
    });
    expect(
      paymentStateFor(
        holding,
        { ...withUrl, providerStatus: "IN_PROGRESS" },
        T(1),
      ),
    ).toEqual({ kind: "pending" });
  });

  it("reports failure with the reason", () => {
    expect(
      paymentStateFor(
        holding,
        tap({ status: "failed", failureReason: "Declined" }),
        T(1),
      ),
    ).toEqual({ kind: "failed", reason: "Declined" });
  });

  it("expires when the hold lapsed or the Booking ended", () => {
    expect(paymentStateFor(holding, tap(), T(10))).toEqual({ kind: "expired" });
    expect(
      paymentStateFor({ status: "expired", holdExpiresAt: null }, null, T(1)),
    ).toEqual({ kind: "expired" });
    expect(
      paymentStateFor({ status: "cancelled", holdExpiresAt: null }, null, T(1)),
    ).toEqual({ kind: "expired" });
  });

  it("is deferred for a manual pending Payment and paid once confirmed", () => {
    const manual = tap({ provider: "manual" });
    expect(
      paymentStateFor(
        { status: "confirmed", holdExpiresAt: null },
        manual,
        T(1),
      ),
    ).toEqual({ kind: "deferred" });
    expect(
      paymentStateFor(
        { status: "confirmed", holdExpiresAt: null },
        tap({ status: "paid" }),
        T(1),
      ),
    ).toEqual({ kind: "paid" });
  });
});
