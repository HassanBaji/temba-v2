import { describe, expect, it } from "vitest";

import {
  holdCountdown,
  paymentPageHint,
  paymentView,
  shouldPoll,
} from "./payment-model";

describe("paymentView", () => {
  it("waits while the charge is prepared or checked", () => {
    expect(paymentView({ kind: "preparing" }).kind).toBe("waiting");
    expect(paymentView({ kind: "pending" }).kind).toBe("waiting");
  });

  it("opens the hosted page on redirect", () => {
    expect(
      paymentView({ kind: "redirect", redirectUrl: "https://pay.example" }),
    ).toEqual({ kind: "open", redirectUrl: "https://pay.example" });
  });

  it("shows the provider's reason on failure", () => {
    expect(paymentView({ kind: "failed", reason: "Declined" })).toMatchObject({
      kind: "failed",
      description: "Declined",
    });
    expect(paymentView({ kind: "failed", reason: null })).toMatchObject({
      kind: "failed",
      description: "Your card was not charged. Try again.",
    });
  });

  it("finishes for paid and pay-at-venue Bookings", () => {
    expect(paymentView({ kind: "paid" }).kind).toBe("done");
    expect(paymentView({ kind: "deferred" }).kind).toBe("done");
    expect(paymentView({ kind: "expired" }).kind).toBe("expired");
  });
});

describe("shouldPoll", () => {
  it("stops on a terminal state", () => {
    expect(shouldPoll(undefined)).toBe(true);
    expect(shouldPoll({ kind: "preparing" })).toBe(true);
    expect(shouldPoll({ kind: "redirect", redirectUrl: "x" })).toBe(true);
    expect(shouldPoll({ kind: "failed", reason: null })).toBe(false);
    expect(shouldPoll({ kind: "paid" })).toBe(false);
    expect(shouldPoll({ kind: "expired" })).toBe(false);
  });
});

describe("holdCountdown", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("counts minutes and seconds left", () => {
    expect(holdCountdown(new Date("2026-10-15T12:09:05Z"), now)).toBe("9:05");
    expect(holdCountdown(new Date("2026-10-15T12:00:00.400Z"), now)).toBe(
      "0:01",
    );
  });

  it("is null without a hold or once it lapsed", () => {
    expect(holdCountdown(null, now)).toBeNull();
    expect(holdCountdown(new Date("2026-10-15T11:59:59Z"), now)).toBeNull();
  });
});

describe("paymentPageHint", () => {
  it("tells the Customer what the page for their method asks", () => {
    expect(paymentPageHint("benefitpay")).toBe(
      "Approve in the BenefitPay app or scan the QR code, then come back here.",
    );
    expect(paymentPageHint("card")).toMatch(/Enter your card/);
  });

  it("falls back to the page in general without a known method", () => {
    expect(paymentPageHint(null)).toBe(
      "Finish paying on the payment page, then come back here.",
    );
  });
});
