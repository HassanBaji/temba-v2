import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { occupyingBookings } from "#src/bookings/occupying";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function deleteCourt(
  database: DbClient,
  args: { courtId: string; actor: Actor; now?: Date; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const existing = await database.query.courts.findFirst({
    where: eq(courts.id, args.courtId),
    columns: { id: true, venueId: true },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.courtNotFound,
    });
  }

  await requireVenueManager(database, {
    venueId: existing.venueId,
    ...args.actor,
    locale,
  });

  const [upcoming] = await database
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.courtId, args.courtId),
        gt(bookings.endsAt, args.now ?? new Date()),
        occupyingBookings(args.now ?? new Date()),
      ),
    )
    .limit(1);
  if (upcoming) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).venue.errors.cancelBookingsFirst,
    });
  }

  const [anyBooking] = await database
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.courtId, args.courtId))
    .limit(1);
  if (anyBooking) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).venue.errors.courtHasHistory,
    });
  }

  await database.delete(courts).where(eq(courts.id, args.courtId));
  return { id: existing.id };
}

export const deleteCourtProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deleteCourt(ctx.db, {
      courtId: input.id,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
