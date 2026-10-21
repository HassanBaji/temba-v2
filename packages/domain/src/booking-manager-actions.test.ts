import { describe, expect, it } from "vitest";

import { managerBookingActions } from "./booking-manager-actions";

const startsAt = new Date("2030-01-07T15:00:00Z");
const endsAt = new Date("2030-01-07T16:30:00Z");
const before = new Date("2030-01-07T12:00:00Z");
const during = new Date("2030-01-07T15:30:00Z");
const after = new Date("2030-01-07T17:00:00Z");

const confirmed = { status: "confirmed" as const, startsAt, endsAt };

describe("managerBookingActions", () => {
  it("edits and cancels a confirmed Booking before it starts", () => {
    expect(managerBookingActions(confirmed, false, before)).toEqual({
      edit: true,
      cancel: true,
      noShow: false,
    });
  });

  it("adds no-show once it has started and keeps only no-show after its end", () => {
    expect(managerBookingActions(confirmed, false, during)).toEqual({
      edit: true,
      cancel: true,
      noShow: true,
    });
    expect(managerBookingActions(confirmed, false, after)).toEqual({
      edit: false,
      cancel: false,
      noShow: true,
    });
  });

  it("cancels a Booking pending payment but neither edits nor marks it no-show", () => {
    expect(
      managerBookingActions(
        { ...confirmed, status: "pending_payment" },
        false,
        during,
      ),
    ).toEqual({ edit: false, cancel: true, noShow: false });
  });

  it("allows nothing on a finished Booking", () => {
    for (const status of ["cancelled", "no_show", "expired"] as const) {
      expect(
        managerBookingActions({ ...confirmed, status }, false, during),
      ).toEqual({ edit: false, cancel: false, noShow: false });
    }
  });

  it("refuses edits on a Soft-archived Venue but still cancels and marks no-show", () => {
    expect(managerBookingActions(confirmed, true, during)).toEqual({
      edit: false,
      cancel: true,
      noShow: true,
    });
  });
});
