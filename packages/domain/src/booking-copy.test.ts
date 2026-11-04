import { describe, expect, it } from "vitest";

import {
  bookedCourtLine,
  bookingStatusLabel,
  cancelWindowClosedMessage,
  describeNextRefundStep,
  slotRefusalMessage,
} from "./booking-copy";
import { nextRefundStep } from "./booking-refund";
import { zonedDateTimeToInstant } from "./product-timezone";

describe("booking copy", () => {
  it("labels every status", () => {
    expect(bookingStatusLabel("no_show", "en")).toBe("No-show");
    expect(bookingStatusLabel("pending_payment", "en")).toBe(
      "Awaiting payment",
    );
  });

  it("points a late cancel at the Venue phone when there is one", () => {
    expect(cancelWindowClosedMessage("+973 1700 0000", "en")).toContain(
      "+973 1700 0000",
    );
    expect(cancelWindowClosedMessage(null, "en")).toContain(
      "Contact the Venue",
    );
  });

  it("writes the next refund step in the product timezone", () => {
    const startsAt = zonedDateTimeToInstant({
      year: 2030,
      month: 1,
      day: 10,
      hour: 19,
    });
    const now = zonedDateTimeToInstant({
      year: 2030,
      month: 1,
      day: 5,
      hour: 9,
    });
    const step = nextRefundStep(
      {
        tiers: [
          { hoursBefore: 24, refundPercent: 100 },
          { hoursBefore: 12, refundPercent: 50 },
        ],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 0,
      },
      startsAt,
      now,
    );
    expect(describeNextRefundStep(step, "en")).toBe(
      "Full refund until Wed 19:00, then 50% refund",
    );
    expect(describeNextRefundStep(step, "ar")).toBe(
      "استرداد كامل حتى الأربعاء 19:00، ثم استرداد 50%",
    );
    expect(describeNextRefundStep(null, "en")).toBeNull();
  });

  it("writes the Booked line in the product timezone", () => {
    expect(
      bookedCourtLine(
        {
          courtName: "Court 2",
          startsAt: zonedDateTimeToInstant({
            year: 2030,
            month: 1,
            day: 10,
            hour: 19,
          }),
          endsAt: zonedDateTimeToInstant({
            year: 2030,
            month: 1,
            day: 10,
            hour: 20,
            minute: 30,
          }),
        },
        "en",
      ),
    ).toBe("Court 2, 7:00 PM to 8:30 PM");
  });

  it("names a refused Slot in each language", () => {
    expect(slotRefusalMessage("taken", "en")).toBe("That slot was just taken");
    expect(slotRefusalMessage("taken", "ar")).toBe("تم حجز هذه الفترة للتو");
  });
});
