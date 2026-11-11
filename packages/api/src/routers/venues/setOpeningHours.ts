import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { venueOpeningHours, venues } from "@repo/db";
import type { DbClient } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

const MAX_CLOSE_MINUTES = 1800;

type Window = { opensAtMinutes: number; closesAtMinutes: number };

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function validateWindows(
  windows: Window[],
  slotMinutes: number,
  locale: Locale = DEFAULT_LOCALE,
) {
  for (const window of windows) {
    if (
      !Number.isInteger(window.opensAtMinutes) ||
      !Number.isInteger(window.closesAtMinutes) ||
      window.opensAtMinutes < 0
    ) {
      badRequest(messagesFor(locale).venue.errors.hoursWholeMinutes);
    }
    if (window.closesAtMinutes <= window.opensAtMinutes) {
      badRequest(messagesFor(locale).consoleHours.weekly.closeAfterOpen);
    }
    if (window.closesAtMinutes > MAX_CLOSE_MINUTES) {
      badRequest(messagesFor(locale).venue.errors.hoursLatestClose);
    }
    if (
      window.opensAtMinutes % slotMinutes !== 0 ||
      window.closesAtMinutes % slotMinutes !== 0
    ) {
      badRequest(messagesFor(locale).venue.errors.onGrid(slotMinutes));
    }
  }

  const sorted = [...windows].sort(
    (a, b) => a.opensAtMinutes - b.opensAtMinutes,
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index]!.opensAtMinutes < sorted[index - 1]!.closesAtMinutes) {
      badRequest(messagesFor(locale).consoleHours.weekly.overlap);
    }
  }
  return sorted;
}

export async function setOpeningHours(
  database: DbClient,
  args: {
    venueId: string;
    weekday: number;
    windows: Window[];
    actor: Actor;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (!Number.isInteger(args.weekday) || args.weekday < 0 || args.weekday > 6) {
    badRequest(messagesFor(locale).venue.errors.weekdayRange);
  }

  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
    locale,
  });

  return database.transaction(async (tx) => {
    const [venue] = await tx
      .select({ id: venues.id, slotMinutes: venues.slotMinutes })
      .from(venues)
      .where(eq(venues.id, args.venueId))
      .for("update");

    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).venue.errors.notFound,
      });
    }

    const sorted = validateWindows(args.windows, venue.slotMinutes, locale);

    await tx
      .delete(venueOpeningHours)
      .where(
        and(
          eq(venueOpeningHours.venueId, args.venueId),
          eq(venueOpeningHours.weekday, args.weekday),
        ),
      );

    if (sorted.length > 0) {
      await tx.insert(venueOpeningHours).values(
        sorted.map((window) => ({
          venueId: args.venueId,
          weekday: args.weekday,
          opensAtMinutes: window.opensAtMinutes,
          closesAtMinutes: window.closesAtMinutes,
        })),
      );
    }

    await tx
      .update(venues)
      .set({ updatedAt: new Date() })
      .where(eq(venues.id, args.venueId));

    return tx
      .select({
        id: venueOpeningHours.id,
        weekday: venueOpeningHours.weekday,
        opensAtMinutes: venueOpeningHours.opensAtMinutes,
        closesAtMinutes: venueOpeningHours.closesAtMinutes,
      })
      .from(venueOpeningHours)
      .where(
        and(
          eq(venueOpeningHours.venueId, args.venueId),
          eq(venueOpeningHours.weekday, args.weekday),
        ),
      )
      .orderBy(asc(venueOpeningHours.opensAtMinutes));
  });
}

export const setOpeningHoursProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      weekday: z.number().int().min(0).max(6),
      windows: z
        .array(
          z.object({
            opensAtMinutes: z.number().int(),
            closesAtMinutes: z.number().int(),
          }),
        )
        .max(8),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setOpeningHours(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
