import { describe, expect, it } from "vitest";

import {
  addDays,
  bookingTitle,
  countLabel,
  durationLabel,
  inScope,
  matchesSearch,
  paymentWord,
  scopeQuery,
  sourceLabel,
  timeRangeLabel,
  whenLabel,
} from "./booking-list-model";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

const at = (day: number, hour: number, minute = 0) =>
  zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });

describe("scopeQuery", () => {
  it("asks the door for the week ahead, the month behind, or that month's cancellations", () => {
    expect(scopeQuery("upcoming", "2030-01-10")).toEqual({
      from: "2030-01-10",
      to: "2030-01-16",
      status: ["confirmed", "pending_payment"],
    });
    expect(scopeQuery("past", "2030-01-10")).toEqual({
      from: "2029-12-12",
      to: "2030-01-10",
      status: ["confirmed", "no_show"],
    });
    expect(scopeQuery("cancelled", "2030-01-10")).toEqual({
      from: "2029-12-12",
      to: "2030-01-10",
      status: ["cancelled", "expired"],
    });
  });

  it("walks days across month ends", () => {
    expect(addDays("2030-01-31", 1)).toBe("2030-02-01");
    expect(addDays("2030-03-01", -1)).toBe("2030-02-28");
  });
});

describe("inScope", () => {
  const now = at(10, 12);
  const ended = { endsAt: at(10, 11) };
  const running = { endsAt: at(10, 13) };

  it("keeps today's rows on the right side of now", () => {
    expect(inScope(running, "upcoming", now)).toBe(true);
    expect(inScope(ended, "upcoming", now)).toBe(false);
    expect(inScope(ended, "past", now)).toBe(true);
    expect(inScope(running, "past", now)).toBe(false);
    expect(inScope(ended, "cancelled", now)).toBe(true);
    expect(inScope(running, "cancelled", now)).toBe(true);
  });
});

describe("matchesSearch", () => {
  const guest = {
    id: "8f2c1a4e-0000-4000-8000-000000000000",
    holder: {
      kind: "guest" as const,
      name: "Sara Lind",
      phone: "+973 3345 0012",
    },
  };
  const member = {
    id: "a1b2c3d4-0000-4000-8000-000000000000",
    holder: { kind: "user" as const, name: "Adam Rashid" },
  };

  it("matches the holder name regardless of case", () => {
    expect(matchesSearch(guest, "sara")).toBe(true);
    expect(matchesSearch(member, "RASH")).toBe(true);
    expect(matchesSearch(member, "sara")).toBe(false);
  });

  it("matches a guest phone by its digits however it is typed", () => {
    expect(matchesSearch(guest, "3345 0012")).toBe(true);
    expect(matchesSearch(guest, "+97333450012")).toBe(true);
    expect(matchesSearch(guest, "0012")).toBe(true);
    expect(matchesSearch(member, "3345")).toBe(false);
  });

  it("matches the start of the Booking id and lets an empty query through", () => {
    expect(matchesSearch(guest, "8F2C")).toBe(true);
    expect(matchesSearch(guest, "2c1a")).toBe(false);
    expect(matchesSearch(guest, "   ")).toBe(true);
  });
});

describe("labels", () => {
  const now = at(10, 12);

  it("names the day relative to now within a week and by date beyond it", () => {
    expect(whenLabel(at(10, 18), now)).toBe("Today 6:00 PM");
    expect(whenLabel(at(11, 19), now)).toBe("Tomorrow 7:00 PM");
    expect(whenLabel(at(9, 20), now)).toBe("Yesterday 8:00 PM");
    expect(whenLabel(at(13, 17), now)).toBe("Sun 5:00 PM");
    expect(whenLabel(at(17, 17), now)).toBe("Thu 17 Jan 5:00 PM");
    expect(whenLabel(at(1, 9, 30), now)).toBe("Tue 1 Jan 9:30 AM");
  });

  it("writes the duration in minutes", () => {
    expect(durationLabel(at(10, 18), at(10, 19, 30))).toBe("90 min");
    expect(durationLabel(at(10, 18), at(10, 19))).toBe("60 min");
  });

  it("repeats the meridiem only when it changes across the slot", () => {
    expect(timeRangeLabel(at(10, 19), at(10, 20, 30))).toBe("7:00 to 8:30 PM");
    expect(timeRangeLabel(at(10, 11), at(10, 12, 30))).toBe(
      "11:00 AM to 12:30 PM",
    );
    expect(
      bookingTitle({
        court: { name: "Court 2" },
        startsAt: at(17, 19),
        endsAt: at(17, 20, 30),
      }),
    ).toBe("Court 2, Thu 17 Jan 7:00 to 8:30 PM");
  });

  it("names the source and the payment mark", () => {
    expect(sourceLabel("app")).toBe("App");
    expect(sourceLabel("venue")).toBe("Manual");
    expect(paymentWord("paid")).toEqual({ mark: "paid", word: "Paid" });
    expect(paymentWord("pending")).toEqual({ mark: "open", word: "Unpaid" });
    expect(paymentWord("failed").mark).toBe("failed");
  });

  it("counts for the scope", () => {
    expect(countLabel("upcoming", 61)).toBe("61 bookings, next 7 days");
    expect(countLabel("past", 1)).toBe("1 booking, last 30 days");
    expect(countLabel("cancelled", 0)).toBe(
      "0 cancelled or expired, last 30 days",
    );
  });
});
