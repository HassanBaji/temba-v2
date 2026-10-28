import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import { SLOT_REFUSAL_MESSAGES } from "@repo/domain/booking-copy";
import { evaluateSlot } from "@repo/domain/booking-slots";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadVenueSlotContext } from "#src/bookings/availability";
import {
  bookingWithLedger,
  openPayment,
  settlePayment,
  type ManualMethod,
} from "#src/bookings/payments";
import { reserveBooking } from "#src/bookings/reserve";
import { enqueue } from "#src/jobs/enqueue";
import { bookingConfirmedJob } from "#src/jobs/specs";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const MS_PER_MINUTE = 60_000;

export type BookingHolder =
  | { userId: string }
  | { guestName: string; guestPhone: string };

export async function createBookingForVenue(
  database: DbClient,
  args: {
    venueId: string;
    courtId: string;
    startsAt: Date;
    durationMinutes: number;
    holder: BookingHolder;
    priceFils?: number;
    payment?: {
      status: "paid" | "waived";
      method?: ManualMethod;
      reference?: string;
    };
    managerNotes?: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
) {
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    await requireVenueManager(tx, { venueId: args.venueId, ...args.actor });

    const context = await loadVenueSlotContext(tx, args.venueId, now);
    if (!context) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    }
    if (context.venue.archivedAt !== null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Venue is archived",
      });
    }
    if (!context.courts.some((court) => court.id === args.courtId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That Court does not belong to this Venue",
      });
    }

    if ("userId" in args.holder) {
      const [holder] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, args.holder.userId));
      if (!holder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
    }

    const check = evaluateSlot(
      context.input,
      {
        courtId: args.courtId,
        startsAt: args.startsAt,
        durationMinutes: args.durationMinutes,
      },
      "manager",
    );
    const typedPriceCoversGap =
      !check.ok && check.reason === "no_price" && args.priceFils !== undefined;
    if (!check.ok && !typedPriceCoversGap) {
      throw new TRPCError({
        code: check.reason === "taken" ? "CONFLICT" : "BAD_REQUEST",
        message:
          check.reason === "no_price"
            ? "No Pricing rule covers that time. Type a price"
            : SLOT_REFUSAL_MESSAGES[check.reason],
      });
    }
    const priceFils = args.priceFils ?? (check.ok ? check.priceFils : 0);

    const bookingId = await reserveBooking(tx, {
      now,
      values: {
        venueId: args.venueId,
        courtId: args.courtId,
        ...("userId" in args.holder
          ? { userId: args.holder.userId }
          : {
              guestName: args.holder.guestName,
              guestPhone: args.holder.guestPhone,
            }),
        startsAt: args.startsAt,
        endsAt: new Date(
          args.startsAt.getTime() + args.durationMinutes * MS_PER_MINUTE,
        ),
        status: "confirmed",
        source: "venue",
        priceFils,
        cancellationPolicy: context.venue.cancellationPolicy,
        paymentStatus: "pending",
        managerNotes: args.managerNotes,
        createdByUserId: args.actor.userId,
        createdAt: now,
        updatedAt: now,
      },
    });

    await openPayment(tx, {
      bookingId,
      provider: "manual",
      amountFils: priceFils,
      now,
    });
    if (args.payment) {
      await settlePayment(tx, {
        bookingId,
        outcome: args.payment.status,
        method: args.payment.method,
        reference: args.payment.reference,
        actorUserId: args.actor.userId,
        amountFils: priceFils,
        now,
      });
    }
    await enqueue(tx, bookingConfirmedJob(bookingId));

    return bookingWithLedger(tx, bookingId);
  });
}

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createForVenueProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      courtId: z.string().uuid(),
      startsAt: z.date(),
      durationMinutes: z.number().int().positive(),
      holder: z.union([
        z.object({ userId: z.string().uuid() }),
        z.object({ guestName: trimmed(255), guestPhone: trimmed(32) }),
      ]),
      priceFils: z.number().int().min(0).max(10_000_000).optional(),
      payment: z
        .object({
          status: z.enum(["paid", "waived"]),
          method: z.enum(["cash", "card", "benefit", "transfer"]).optional(),
          reference: trimmed(255).optional(),
        })
        .optional(),
      managerNotes: trimmed(1000).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createBookingForVenue(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
