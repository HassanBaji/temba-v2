import { describe, expect, it } from "vitest";

import {
  holdCountdown,
  isSlowWait,
  methodName,
  paymentCopy,
  paymentPageHint,
  paymentView,
  retryMethods,
  shouldPoll,
} from "./payment-model";

describe("paymentView", () => {
  it("tells preparing apart from checking a charge that was opened", () => {
    expect(paymentView({ kind: "preparing" }).kind).toBe("preparing");
    expect(paymentView({ kind: "pending" }).kind).toBe("checking");
  });

  it("opens the hosted page on redirect", () => {
    expect(
      paymentView({ kind: "redirect", redirectUrl: "https://pay.example" }),
    ).toEqual({ kind: "open", redirectUrl: "https://pay.example" });
  });

  it("keeps the provider's reason on failure", () => {
    expect(paymentView({ kind: "failed", reason: "Declined" })).toEqual({
      kind: "failed",
      reason: "Declined",
    });
  });

  it("finishes for paid and pay-at-venue Bookings", () => {
    expect(paymentView({ kind: "paid" }).kind).toBe("done");
    expect(paymentView({ kind: "deferred" }).kind).toBe("done");
    expect(paymentView({ kind: "expired" }).kind).toBe("expired");
  });
});

describe("paymentCopy", () => {
  const open = { kind: "open", redirectUrl: "https://pay.example" } as const;

  it("names the method the Customer is paying with", () => {
    const copy = paymentCopy(open, { method: "benefitpay", slow: false });
    expect(copy.title).toBe("Finish paying in your browser.");
    expect(copy.body).toMatch(/^Approve in the BenefitPay app/);
    expect(copy.status).toBe("Waiting for BenefitPay");
    expect(copy.hint).toMatch(/Open it again/);
  });

  it("switches to the slow copy for both open and checking waits", () => {
    for (const view of [open, { kind: "checking" } as const]) {
      const copy = paymentCopy(view, { method: "card", slow: true });
      expect(copy.title).toBe("Still waiting.");
      expect(copy.body).toMatch(/^Card has not confirmed yet/);
      expect(copy.status).toBe("Taking longer than usual");
    }
  });

  it("never calls preparing slow", () => {
    expect(
      paymentCopy({ kind: "preparing" }, { method: "card", slow: true }).title,
    ).toBe("Getting the payment page ready.");
  });

  it("shows the provider's reason on failure, else says nothing was charged", () => {
    expect(
      paymentCopy(
        { kind: "failed", reason: "Declined by the bank" },
        { method: "card", slow: false },
      ).body,
    ).toBe("Declined by the bank");
    expect(
      paymentCopy(
        { kind: "failed", reason: null },
        { method: null, slow: false },
      ).body,
    ).toBe("Nothing was charged. Try again, or pay another way.");
    expect(
      paymentCopy(
        { kind: "failed", reason: null },
        { method: "card", slow: false },
      ).body,
    ).toBe("Nothing was charged to Card. Try again, or pay another way.");
  });

  it("has no live status once the wait is over", () => {
    expect(
      paymentCopy({ kind: "expired" }, { method: "card", slow: false }).status,
    ).toBeNull();
  });
});

describe("methodName", () => {
  it("is the checkout title for online methods only", () => {
    expect(methodName("apple_pay")).toBe("Apple Pay");
    expect(methodName("at_venue")).toBeNull();
    expect(methodName(null)).toBeNull();
  });
});

describe("retryMethods", () => {
  it("drops pay at the venue", () => {
    expect(retryMethods(["card", "benefitpay", "at_venue"])).toEqual([
      "card",
      "benefitpay",
    ]);
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

describe("isSlowWait", () => {
  const now = new Date("2026-10-15T12:01:00Z");

  it("turns slow a minute after the wait began", () => {
    expect(isSlowWait(new Date("2026-10-15T12:00:00Z"), now)).toBe(true);
    expect(isSlowWait(new Date("2026-10-15T12:00:01Z"), now)).toBe(false);
    expect(isSlowWait(null, now)).toBe(false);
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
