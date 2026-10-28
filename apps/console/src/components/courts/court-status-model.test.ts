import { describe, expect, it } from "vitest";

import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import { closedUntilLabel, courtAvailability } from "./court-status-model";

function bahrain(year: number, month: number, day: number, hour = 0) {
  return zonedDateTimeToInstant({ year, month, day, hour });
}

const now = bahrain(2026, 11, 3, 9);

describe("court availability", () => {
  it("is bookable without a covering Closure", () => {
    expect(
      courtAvailability({
        courtId: "c1",
        closures: [
          {
            courtId: "c1",
            startsAt: bahrain(2026, 11, 3, 10),
            endsAt: bahrain(2026, 11, 3, 17),
          },
          {
            courtId: "c2",
            startsAt: bahrain(2026, 11, 3, 7),
            endsAt: bahrain(2026, 11, 3, 17),
          },
        ],
        acceptingBookings: true,
        now,
      }),
    ).toEqual({ kind: "bookable" });
  });

  it("is closed by a Court or Venue-wide Closure covering now, until the latest end", () => {
    const result = courtAvailability({
      courtId: "c1",
      closures: [
        {
          courtId: "c1",
          startsAt: bahrain(2026, 11, 3, 7),
          endsAt: bahrain(2026, 11, 3, 12),
        },
        {
          courtId: null,
          startsAt: bahrain(2026, 11, 3, 8),
          endsAt: bahrain(2026, 11, 3, 17),
        },
      ],
      acceptingBookings: true,
      now,
    });
    expect(result).toEqual({ kind: "closed", until: bahrain(2026, 11, 3, 17) });
  });

  it("is paused when the Venue is not accepting bookings", () => {
    expect(
      courtAvailability({
        courtId: "c1",
        closures: [],
        acceptingBookings: false,
        now,
      }),
    ).toEqual({ kind: "paused" });
  });

  it("labels the closed-until time as a clock today and a date otherwise", () => {
    expect(closedUntilLabel(bahrain(2026, 11, 3, 17), now)).toBe(
      "Closed to 5:00 PM",
    );
    expect(closedUntilLabel(bahrain(2026, 11, 7, 17), now)).toBe(
      "Closed to Sat 7 Nov",
    );
  });
});
