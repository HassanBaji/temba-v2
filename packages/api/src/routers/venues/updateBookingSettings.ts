import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { courts, venueOpeningHours, venuePricingRules, venues } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

const MIN_DURATION = 30;
const MAX_DURATION = 240;

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

type Settings = {
  acceptingBookings?: boolean;
  slotMinutes?: number;
  durationOptionsMinutes?: number[];
  bookingHorizonDays?: number;
  minLeadMinutes?: number;
  payAtVenueAllowed?: boolean;
  description?: string | null;
  bookingNotes?: string | null;
};

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

type DbClient = typeof db;

export async function updateBookingSettings(
  database: DbClient,
  args: Settings & {
    venueId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
    locale,
  });

  if (
    args.slotMinutes !== undefined &&
    args.slotMinutes !== 30 &&
    args.slotMinutes !== 60
  ) {
    badRequest(messagesFor(locale).venue.errors.slotLength);
  }
  if (
    args.bookingHorizonDays !== undefined &&
    (!Number.isInteger(args.bookingHorizonDays) ||
      args.bookingHorizonDays < 1 ||
      args.bookingHorizonDays > 90)
  ) {
    badRequest(messagesFor(locale).venue.errors.horizonRange);
  }
  if (
    args.minLeadMinutes !== undefined &&
    (!Number.isInteger(args.minLeadMinutes) ||
      args.minLeadMinutes < 0 ||
      args.minLeadMinutes > 1440)
  ) {
    badRequest(messagesFor(locale).venue.errors.leadTimeRange);
  }
  if (args.durationOptionsMinutes !== undefined) {
    const durations = args.durationOptionsMinutes;
    if (durations.length === 0) {
      badRequest(messagesFor(locale).venue.errors.durationRequired);
    }
    if (
      durations.some(
        (minutes) =>
          !Number.isInteger(minutes) ||
          minutes < MIN_DURATION ||
          minutes > MAX_DURATION,
      )
    ) {
      badRequest(
        messagesFor(locale).venue.errors.durationRange(
          MIN_DURATION,
          MAX_DURATION,
        ),
      );
    }
  }

  return database.transaction(async (tx) => {
    const [venue] = await tx
      .select({
        id: venues.id,
        archivedAt: venues.archivedAt,
        slotMinutes: venues.slotMinutes,
        durationOptionsMinutes: venues.durationOptionsMinutes,
      })
      .from(venues)
      .where(eq(venues.id, args.venueId))
      .for("update");

    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).venue.errors.notFound,
      });
    }

    const slotMinutes = args.slotMinutes ?? venue.slotMinutes;
    const durations = [
      ...new Set(args.durationOptionsMinutes ?? venue.durationOptionsMinutes),
    ].sort((a, b) => a - b);

    if (durations.some((minutes) => minutes % slotMinutes !== 0)) {
      badRequest(
        messagesFor(locale).venue.errors.durationMultiple(slotMinutes),
      );
    }

    if (
      args.slotMinutes !== undefined &&
      args.slotMinutes !== venue.slotMinutes
    ) {
      const hours = await tx
        .select({
          opensAtMinutes: venueOpeningHours.opensAtMinutes,
          closesAtMinutes: venueOpeningHours.closesAtMinutes,
        })
        .from(venueOpeningHours)
        .where(eq(venueOpeningHours.venueId, args.venueId));
      if (
        hours.some(
          (window) =>
            window.opensAtMinutes % slotMinutes !== 0 ||
            window.closesAtMinutes % slotMinutes !== 0,
        )
      ) {
        badRequest(messagesFor(locale).venue.errors.hoursOffGrid(slotMinutes));
      }

      const rules = await tx
        .select({
          startMinutes: venuePricingRules.startMinutes,
          endMinutes: venuePricingRules.endMinutes,
        })
        .from(venuePricingRules)
        .where(eq(venuePricingRules.venueId, args.venueId));
      if (
        rules.some(
          (rule) =>
            rule.startMinutes % slotMinutes !== 0 ||
            rule.endMinutes % slotMinutes !== 0,
        )
      ) {
        badRequest(
          messagesFor(locale).venue.errors.pricingOffGrid(slotMinutes),
        );
      }
    }

    if (args.acceptingBookings === true) {
      if (venue.archivedAt) {
        badRequest(messagesFor(locale).venue.errors.archivedNoBookings);
      }
      const [courtCount] = await tx
        .select({ value: count() })
        .from(courts)
        .where(eq(courts.venueId, args.venueId));
      if (!courtCount || courtCount.value === 0) {
        badRequest(messagesFor(locale).venue.errors.addCourtFirst);
      }
    }

    const [updated] = await tx
      .update(venues)
      .set({
        ...(args.acceptingBookings !== undefined
          ? { acceptingBookings: args.acceptingBookings }
          : {}),
        ...(args.slotMinutes !== undefined
          ? { slotMinutes: args.slotMinutes }
          : {}),
        ...(args.durationOptionsMinutes !== undefined
          ? { durationOptionsMinutes: durations }
          : {}),
        ...(args.bookingHorizonDays !== undefined
          ? { bookingHorizonDays: args.bookingHorizonDays }
          : {}),
        ...(args.minLeadMinutes !== undefined
          ? { minLeadMinutes: args.minLeadMinutes }
          : {}),
        ...(args.payAtVenueAllowed !== undefined
          ? { payAtVenueAllowed: args.payAtVenueAllowed }
          : {}),
        ...(args.description !== undefined
          ? { description: args.description }
          : {}),
        ...(args.bookingNotes !== undefined
          ? { bookingNotes: args.bookingNotes }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, args.venueId))
      .returning({
        id: venues.id,
        acceptingBookings: venues.acceptingBookings,
        slotMinutes: venues.slotMinutes,
        durationOptionsMinutes: venues.durationOptionsMinutes,
        bookingHorizonDays: venues.bookingHorizonDays,
        minLeadMinutes: venues.minLeadMinutes,
        payAtVenueAllowed: venues.payAtVenueAllowed,
        description: venues.description,
        bookingNotes: venues.bookingNotes,
        updatedAt: venues.updatedAt,
      });

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update Booking settings",
      });
    }

    return updated;
  });
}

export const updateBookingSettingsProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      acceptingBookings: z.boolean().optional(),
      slotMinutes: z.number().int().optional(),
      durationOptionsMinutes: z.array(z.number().int()).max(12).optional(),
      bookingHorizonDays: z.number().int().optional(),
      minLeadMinutes: z.number().int().optional(),
      payAtVenueAllowed: z.boolean().optional(),
      description: optionalText,
      bookingNotes: optionalText,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateBookingSettings(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
