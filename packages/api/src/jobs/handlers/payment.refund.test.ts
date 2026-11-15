import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { refundableFils } from "#src/bookings/payments";

import { handle } from "./payment.refund";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("payment.refund", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  async function paidCharge(
    db: Parameters<typeof asDb>[0],
    f: Parameters<typeof chargedBooking>[1],
  ) {
    const { booking, payment } = await chargedBooking(db, f);
    await db
      .update(bookingPayments)
      .set({ status: "paid", settledAt: NOW })
      .where(eq(bookingPayments.id, payment.id));
    await db
      .update(bookings)
      .set({ status: "confirmed", holdExpiresAt: null, paymentStatus: "paid" })
      .where(eq(bookings.id, booking.id));
    return { booking, payment };
  }

  const payload = (
    paymentId: string,
    amountFils: number,
    refundKey: string,
  ) => ({
    paymentId,
    amountFils,
    reason: "manager" as const,
    refundKey,
  });

  it("records a partial then a full refund and queues the notification", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await paidCharge(db, f);
      jobs.clear();
      const total = payment.amountFils;

      await handle(
        asDb(db),
        payload(payment.id, 4_000, "k1"),
        undefined,
        minutes(1),
      );
      expect(provider.fake.refundCalls).toEqual([
        {
          reference: payment.providerReference,
          amountFils: 4_000,
          idempotencyKey: "k1",
        },
      ]);
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "partially_refunded",
        refundedFils: 4_000,
        refundReference: "rfd_fake",
        refundedAt: minutes(1),
        refundFailureReason: null,
      });
      await expectLedgerConsistent(db, booking.id);

      await handle(
        asDb(db),
        payload(payment.id, total - 4_000, "k2"),
        undefined,
        minutes(2),
      );
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({ status: "refunded", refundedFils: total });
      expect((await db.query.bookings.findFirst())?.paymentStatus).toBe(
        "refunded",
      );
      expect(jobNames(jobs)).toEqual([
        "notification.booking",
        "notification.booking",
      ]);
      expect(jobs.added[0]).toMatchObject({
        payload: {
          type: "booking_refund_recorded",
          bookingId: booking.id,
          amountFils: 4_000,
        },
      });
    });
  });

  it("sets refundFailureReason without retrying on a permanent failure", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      provider.fake.refundResult = {
        failed: "Charge already refunded",
        retryable: false,
      };
      jobs.clear();
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).resolves.toBeUndefined();
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "paid",
        refundedFils: 0,
        refundFailureReason: "Charge already refunded",
      });
      expect(jobs.added).toEqual([]);
    });
  });

  it("throws on a retryable failure, keeping the amount reserved and the ledger untouched", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await paidCharge(db, f);
      const before = await db.query.bookingPayments.findFirst({
        where: eq(bookingPayments.id, payment.id),
      });
      provider.fake.refundResult = {
        failed: "Gateway timeout",
        retryable: true,
      };
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).rejects.toThrow("Gateway timeout");
      provider.fake.refundResult = new Error("socket hang up");
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).rejects.toThrow("socket hang up");
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toEqual({
        ...before,
        refundPendingFils: 1_000,
        refundPendingKey: "k1",
      });
      expect(
        jobs.added.filter((job) => job.name === "notification.booking"),
      ).toEqual([]);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("records the failure for the manager when the last attempt is exhausted", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      provider.fake.refundResult = {
        failed: "Gateway timeout",
        retryable: true,
      };
      await expect(
        handle(
          asDb(db),
          payload(payment.id, 1_000, "k1"),
          { job: { attempts: 8, max_attempts: 8 } } as unknown as JobHelpers,
          NOW,
        ),
      ).rejects.toThrow("Gateway timeout");
      expect(
        (
          await db.query.bookingPayments.findFirst({
            where: eq(bookingPayments.id, payment.id),
          })
        )?.refundFailureReason,
      ).toBe("Gateway timeout");
    });
  });

  it("refuses to refund more than is left", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      await handle(
        asDb(db),
        payload(payment.id, payment.amountFils + 1, "k1"),
        undefined,
        NOW,
      );
      expect(provider.fake.refundCalls).toEqual([]);
      expect(
        (
          await db.query.bookingPayments.findFirst({
            where: eq(bookingPayments.id, payment.id),
          })
        )?.refundFailureReason,
      ).toBe("Nothing left to refund");
    });
  });

  describe("with a refund in flight", () => {
    afterEach(() => vi.restoreAllMocks());

    const stored = (db: Parameters<typeof asDb>[0], id: string) =>
      db.query.bookingPayments.findFirst({
        where: eq(bookingPayments.id, id),
      });

    /** Runs `during` while the provider is handling the first refund call. */
    function interleave(during: () => Promise<unknown>) {
      const original = provider.fake.refund.bind(provider.fake);
      let ran = false;
      provider.fake.refund = async (args) => {
        if (!ran) {
          ran = true;
          await during();
        }
        return original(args);
      };
    }

    it("lets only one of two full refunds reach the provider and records the other as failed", async () => {
      await withBookableVenue(async (db, f) => {
        const { payment } = await paidCharge(db, f);
        const total = payment.amountFils;
        let duringFlight: unknown;
        interleave(async () => {
          expect(await stored(db, payment.id)).toMatchObject({
            refundPendingFils: total,
            refundPendingKey: "k1",
          });
          duringFlight = await handle(
            asDb(db),
            payload(payment.id, total, "k2"),
            undefined,
            NOW,
          );
        });

        await handle(
          asDb(db),
          payload(payment.id, total, "k1"),
          undefined,
          NOW,
        );

        expect(duringFlight).toBeUndefined();
        expect(provider.fake.refundCalls.map((c) => c.idempotencyKey)).toEqual([
          "k1",
        ]);
        expect(await stored(db, payment.id)).toMatchObject({
          status: "refunded",
          refundedFils: total,
          refundPendingFils: 0,
          refundPendingKey: null,
          refundFailureReason: null,
        });
      });
    });

    it("records the loser's failure before the winner records its refund", async () => {
      await withBookableVenue(async (db, f) => {
        const { payment } = await paidCharge(db, f);
        interleave(async () => {
          await handle(
            asDb(db),
            payload(payment.id, payment.amountFils, "k2"),
            undefined,
            NOW,
          );
          expect((await stored(db, payment.id))?.refundFailureReason).toBe(
            "Nothing left to refund",
          );
        });
        await handle(
          asDb(db),
          payload(payment.id, payment.amountFils, "k1"),
          undefined,
          NOW,
        );
      });
    });

    it("makes a refund that would fit wait, and records it once out of attempts", async () => {
      await withBookableVenue(async (db, f) => {
        const { payment } = await paidCharge(db, f);
        const errors = vi.spyOn(console, "error").mockImplementation(() => {});
        interleave(async () => {
          await expect(
            handle(asDb(db), payload(payment.id, 1_000, "k2"), undefined, NOW),
          ).rejects.toThrow("still in progress");
          await expect(
            handle(
              asDb(db),
              payload(payment.id, 1_000, "k2"),
              {
                job: { attempts: 8, max_attempts: 8 },
              } as unknown as JobHelpers,
              NOW,
            ),
          ).rejects.toThrow("still in progress");
        });
        await handle(
          asDb(db),
          payload(payment.id, 4_000, "k1"),
          undefined,
          NOW,
        );

        expect(provider.fake.refundCalls).toHaveLength(1);
        expect(await stored(db, payment.id)).toMatchObject({
          refundedFils: 4_000,
          refundPendingFils: 0,
        });
        expect(
          errors.mock.calls.map((call) => JSON.parse(String(call[0]))),
        ).toEqual([
          expect.objectContaining({
            event: "payment_job_gave_up",
            name: "payment.refund",
            paymentId: payment.id,
            refundKey: "k2",
          }),
        ]);
      });
    });

    it("keeps the reservation across a retryable failure and carries on with it", async () => {
      await withBookableVenue(async (db, f) => {
        const { payment } = await paidCharge(db, f);
        provider.fake.refundResult = {
          failed: "Gateway timeout",
          retryable: true,
        };
        await expect(
          handle(asDb(db), payload(payment.id, 4_000, "k1"), undefined, NOW),
        ).rejects.toThrow("Gateway timeout");
        const held = await stored(db, payment.id);
        expect(held).toMatchObject({
          refundPendingFils: 4_000,
          refundPendingKey: "k1",
        });
        expect(refundableFils(held!)).toBe(payment.amountFils - 4_000);

        provider.fake.refundResult = { reference: "rfd_fake" };
        await handle(
          asDb(db),
          payload(payment.id, 4_000, "k1"),
          undefined,
          NOW,
        );
        expect(await stored(db, payment.id)).toMatchObject({
          refundedFils: 4_000,
          refundPendingFils: 0,
          refundPendingKey: null,
        });
      });
    });

    it("releases the reservation on a permanent failure and on the last attempt", async () => {
      await withBookableVenue(async (db, f) => {
        const { payment } = await paidCharge(db, f);
        vi.spyOn(console, "error").mockImplementation(() => {});
        provider.fake.refundResult = { failed: "Rejected", retryable: false };
        await handle(
          asDb(db),
          payload(payment.id, 4_000, "k1"),
          undefined,
          NOW,
        );
        expect(await stored(db, payment.id)).toMatchObject({
          refundPendingFils: 0,
          refundPendingKey: null,
          refundFailureReason: "Rejected",
        });

        provider.fake.refundResult = new Error("socket hang up");
        await expect(
          handle(
            asDb(db),
            payload(payment.id, 4_000, "k2"),
            { job: { attempts: 8, max_attempts: 8 } } as unknown as JobHelpers,
            NOW,
          ),
        ).rejects.toThrow("socket hang up");
        expect(await stored(db, payment.id)).toMatchObject({
          refundPendingFils: 0,
          refundPendingKey: null,
          refundFailureReason: "The provider could not be reached",
        });
      });
    });
  });
});
