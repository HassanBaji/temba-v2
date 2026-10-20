import { describe, expect, it } from "vitest";

import {
  NOW,
  chargedBooking,
  createHeldBooking,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { confirmPayment } from "#src/routers/bookings/confirmPayment";

import { getPaymentState } from "./paymentState";

describe("bookings.paymentState", () => {
  recordJobs();
  const provider = useFakeProvider();

  it("is preparing before the charge exists", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      const state = () =>
        getPaymentState(db, {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        });
      expect(await state()).toEqual({
        kind: "preparing",
        method: "card",
        holdExpiresAt: booking.holdExpiresAt,
      });
    });
  });

  it("reports redirect after the charge is created, pending once opened, paid when confirmed", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      const state = () =>
        getPaymentState(db, {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        });
      expect(await state()).toMatchObject({
        kind: "redirect",
        redirectUrl: payment.clientRedirectUrl,
      });

      provider.fake.chargeState = {
        status: "pending",
        providerStatus: "IN_PROGRESS",
      };
      await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(await state()).toMatchObject({ kind: "pending" });

      provider.fake.chargeState = {
        status: "paid",
        providerStatus: "CAPTURED",
      };
      await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(await state()).toMatchObject({ kind: "paid" });
    });
  });

  it("is expired after the hold and refuses other Users", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      expect(
        await getPaymentState(db, {
          bookingId: booking.id,
          userId: f.customer,
          now: new Date(NOW.getTime() + 11 * 60_000),
        }),
      ).toMatchObject({ kind: "expired" });
      await expect(
        getPaymentState(db, {
          bookingId: booking.id,
          userId: f.other,
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
