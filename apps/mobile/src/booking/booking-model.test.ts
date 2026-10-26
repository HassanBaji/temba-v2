import { describe, expect, it } from "vitest";

import {
  bookedHeadline,
  bookingPath,
  bookingRef,
  bookingRowPath,
  bookingsFallback,
  cancelConsequence,
  checkoutMethods,
  checkoutPath,
  endsAfter,
  payButtonLabel,
  paymentStatusLine,
  placeLine,
  refundTerms,
  slotLine,
  whenLine,
} from "./booking-model";

const NOW = new Date("2026-10-15T12:00:00Z");

function at(wall: string) {
  return new Date(`${wall}+03:00`);
}

describe("booking references and paths", () => {
  it("shortens the id", () => {
    expect(bookingRef("3f2a9c1e-0000-4000-8000-000000000000")).toBe("3F2A9C");
  });

  it("matches the payment return deep link", () => {
    expect(bookingPath("abc")).toBe("/book/bookings/abc");
  });

  it("opens a Booking in the stack of the tab that listed it", () => {
    const confirmed = { id: "abc", status: "confirmed" };
    expect(bookingRowPath(["(app)", "book"], confirmed)).toBe(
      "/book/bookings/abc",
    );
    expect(bookingRowPath(["(app)", "profile", "bookings"], confirmed)).toBe(
      "/profile/bookings/abc",
    );
  });

  it("sends an unpaid Booking to payment in Book from either tab", () => {
    const unpaid = { id: "abc", status: "pending_payment" };
    expect(bookingRowPath(["(app)", "profile", "bookings"], unpaid)).toBe(
      "/book/bookings/abc/payment",
    );
  });

  it("falls back to the list that opened the Booking", () => {
    expect(bookingsFallback(["(app)", "book", "bookings", "[bookingId]"])).toBe(
      "/book",
    );
    expect(
      bookingsFallback(["(app)", "profile", "bookings", "[bookingId]"]),
    ).toBe("/profile/bookings");
  });

  it("carries the start, the length and the Court to checkout", () => {
    expect(checkoutPath("v1", at("2026-10-15T18:00:00"), 90, "c2")).toBe(
      "/book/venues/v1/checkout?startsAt=2026-10-15T15%3A00%3A00.000Z&minutes=90&courtId=c2",
    );
  });

  it("ends a length after the start", () => {
    expect(endsAfter(at("2026-10-15T18:00:00"), 90)).toEqual(
      at("2026-10-15T19:30:00"),
    );
  });
});

describe("whenLine", () => {
  it("names today and tomorrow", () => {
    expect(whenLine(at("2026-10-15T20:30:00"), 90, NOW)).toBe(
      "Today, Thu 15 Oct / 90 min",
    );
    expect(whenLine(at("2026-10-16T20:30:00"), 60, NOW)).toBe(
      "Tomorrow, Fri 16 Oct / 60 min",
    );
    expect(whenLine(at("2026-10-20T08:00:00"), 120, NOW)).toBe(
      "Tue 20 Oct / 120 min",
    );
  });
});

describe("slotLine", () => {
  it("adds the start and end clock", () => {
    expect(slotLine(at("2026-10-15T19:30:00"), 60, NOW)).toBe(
      "Today, Thu 15 Oct / 7:30 PM to 8:30 PM / 60 min",
    );
  });
});

describe("placeLine", () => {
  it("joins day, Venue and Court", () => {
    expect(
      placeLine(at("2026-10-20T08:00:00"), "Karbabad Courts", "Court 2", NOW),
    ).toBe("Tue 20 Oct / Karbabad Courts / Court 2");
  });

  it("says tonight for an evening start today", () => {
    expect(placeLine(at("2026-10-15T20:30:00"), "K", "Court 2", NOW)).toBe(
      "Tonight / K / Court 2",
    );
  });
});

describe("bookedHeadline", () => {
  it("says tonight for an evening Booking today", () => {
    expect(bookedHeadline("Court 2", at("2026-10-15T20:30:00"), NOW)).toBe(
      "Court 2 is yours tonight.",
    );
    expect(bookedHeadline("Court 2", at("2026-10-15T16:00:00"), NOW)).toBe(
      "Court 2 is yours today.",
    );
  });

  it("names tomorrow and later days", () => {
    expect(bookedHeadline("Court 1", at("2026-10-16T09:00:00"), NOW)).toBe(
      "Court 1 is yours tomorrow.",
    );
    expect(bookedHeadline("Court 1", at("2026-10-17T09:00:00"), NOW)).toBe(
      "Court 1 is yours on Saturday.",
    );
  });
});

describe("payButtonLabel", () => {
  it("reserves and names the amount due at the Venue", () => {
    expect(payButtonLabel("at_venue", 18000)).toBe(
      "Reserve, pay 18.000 BD at venue",
    );
  });

  it("shows the amount when paid online", () => {
    expect(payButtonLabel("benefitpay", 18000)).toBe("Pay 18.000 BD");
  });
});

describe("checkoutMethods", () => {
  const methods = [
    "card",
    "benefit",
    "benefitpay",
    "apple_pay",
    "at_venue",
  ] as const;

  it("offers every method the Venue takes, wallet first, on iOS", () => {
    expect(checkoutMethods({ mode: "online", methods }, "ios")).toEqual([
      "apple_pay",
      "benefit",
      "benefitpay",
      "card",
      "at_venue",
    ]);
  });

  it("leaves Apple Pay out off Apple devices", () => {
    expect(checkoutMethods({ mode: "online", methods }, "android")).toEqual([
      "benefit",
      "benefitpay",
      "card",
      "at_venue",
    ]);
  });

  it("offers only the methods the Venue takes", () => {
    expect(
      checkoutMethods({ mode: "online", methods: ["card", "at_venue"] }, "ios"),
    ).toEqual(["card", "at_venue"]);
  });

  it("falls back to the one mode when the API sends no list", () => {
    expect(checkoutMethods({ mode: "at_venue" }, "ios")).toEqual(["at_venue"]);
    expect(checkoutMethods({ mode: "online" }, "ios")).toEqual(["card"]);
  });
});

describe("refundTerms", () => {
  const policy = {
    tiers: [{ hoursBefore: 24, refundPercent: 100 }],
    lateRefundPercent: 0,
    customerCancelUntilMinutes: 0,
  };

  it("names the free cancellation deadline for this start", () => {
    expect(
      refundTerms(
        policy,
        ["Full refund until 24 hours before"],
        at("2026-10-20T18:00:00"),
        NOW,
      ),
    ).toBe("Free cancellation until 6:00 PM Mon 19 Oct.");
    expect(
      refundTerms(
        { ...policy, tiers: [{ hoursBefore: 1, refundPercent: 100 }] },
        [],
        at("2026-10-15T19:30:00"),
        NOW,
      ),
    ).toBe("Free cancellation until 6:30 PM today.");
  });

  it("names a partial refund step", () => {
    expect(
      refundTerms(
        {
          ...policy,
          tiers: [{ hoursBefore: 24, refundPercent: 50 }],
          lateRefundPercent: 0,
        },
        [],
        at("2026-10-20T18:00:00"),
        NOW,
      ),
    ).toBe("50% refund until Mon 18:00, then no refund.");
  });

  it("falls back to the policy line once nothing changes", () => {
    expect(
      refundTerms(
        policy,
        ["No refund after that"],
        at("2026-10-15T20:00:00"),
        NOW,
      ),
    ).toBe("No refund after that.");
  });
});

describe("paymentStatusLine", () => {
  it("reads a confirmed unpaid Booking as paid at the Venue", () => {
    expect(paymentStatusLine("pending", "confirmed")).toBe("Pay at the venue");
    expect(paymentStatusLine("pending", "pending_payment")).toBe("Pending");
    expect(paymentStatusLine("paid", "confirmed")).toBe("Paid");
  });
});

describe("cancelConsequence", () => {
  it("states the refund amount and percent", () => {
    expect(
      cancelConsequence({
        paymentStatus: "paid",
        refundDueFilsNow: 9000,
        refundPercentNow: 50,
      }),
    ).toBe("You'll be refunded 9.000 BD (50%).");
  });

  it("says nothing comes back late or unpaid", () => {
    expect(
      cancelConsequence({
        paymentStatus: "paid",
        refundDueFilsNow: 0,
        refundPercentNow: 0,
      }),
    ).toMatch(/too late/);
    expect(
      cancelConsequence({
        paymentStatus: "pending",
        refundDueFilsNow: 0,
        refundPercentNow: 100,
      }),
    ).toMatch(/nothing to refund/);
  });
});
