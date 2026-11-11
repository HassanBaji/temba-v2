import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { courts, venuePricingRules, venues } from "@repo/db";
import type { DbClient } from "@repo/db";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

const MAX_END_MINUTES = 1800;
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const MAX_RULES = 50;
const MAX_LABEL_LENGTH = 60;

type RuleInput = {
  id?: string;
  courtId?: string | null;
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
  hourlyRateFils: number;
  label?: string | null;
};

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function validateRule(
  rule: RuleInput,
  slotMinutes: number,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (
    rule.weekdays.length === 0 ||
    rule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    badRequest(messagesFor(locale).venue.errors.pricingWeekday);
  }
  if (
    !Number.isInteger(rule.startMinutes) ||
    !Number.isInteger(rule.endMinutes) ||
    rule.startMinutes < 0
  ) {
    badRequest(messagesFor(locale).venue.errors.pricingWholeMinutes);
  }
  if (rule.endMinutes <= rule.startMinutes) {
    badRequest(messagesFor(locale).venue.errors.pricingEndAfterStart);
  }
  if (rule.endMinutes > MAX_END_MINUTES) {
    badRequest(messagesFor(locale).venue.errors.pricingLatestEnd);
  }
  if (
    rule.startMinutes % slotMinutes !== 0 ||
    rule.endMinutes % slotMinutes !== 0
  ) {
    badRequest(messagesFor(locale).venue.errors.onGrid(slotMinutes));
  }
  if (!Number.isInteger(rule.hourlyRateFils) || rule.hourlyRateFils < 0) {
    badRequest(messagesFor(locale).venue.errors.rateNegative);
  }
  if (rule.hourlyRateFils > PRICE_PER_PLAYER_MAX_FILS) {
    badRequest(messagesFor(locale).venue.errors.rateTooLarge);
  }
}

function weekOccupancy(rules: RuleInput[]) {
  return rules.flatMap((rule, ruleIndex) =>
    [...new Set(rule.weekdays)].map((weekday) => ({
      ruleIndex,
      start: weekday * MINUTES_PER_DAY + rule.startMinutes,
      end: weekday * MINUTES_PER_DAY + rule.endMinutes,
    })),
  );
}

function assertNoOverlap(rules: RuleInput[], locale: Locale = DEFAULT_LOCALE) {
  const occupancy = weekOccupancy(rules);
  for (let first = 0; first < occupancy.length; first += 1) {
    for (let second = first + 1; second < occupancy.length; second += 1) {
      const a = occupancy[first]!;
      const b = occupancy[second]!;
      const overlaps = [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK].some(
        (shift) => a.start < b.end + shift && b.start + shift < a.end,
      );
      if (overlaps) {
        badRequest(messagesFor(locale).venue.errors.pricingOverlap);
      }
    }
  }
}

export async function setPricingRules(
  database: DbClient,
  args: {
    venueId: string;
    rules: RuleInput[];
    actor: Actor;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (args.rules.length > MAX_RULES) {
    badRequest(messagesFor(locale).venue.errors.pricingRuleLimit(MAX_RULES));
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

    for (const rule of args.rules) {
      validateRule(rule, venue.slotMinutes, locale);
      if ((rule.label?.trim().length ?? 0) > MAX_LABEL_LENGTH) {
        badRequest(
          messagesFor(locale).venue.errors.labelTooLong(MAX_LABEL_LENGTH),
        );
      }
    }

    const venueCourts = await tx
      .select({ id: courts.id })
      .from(courts)
      .where(eq(courts.venueId, args.venueId));
    const courtIds = new Set(venueCourts.map((court) => court.id));
    if (
      args.rules.some((rule) => rule.courtId && !courtIds.has(rule.courtId))
    ) {
      badRequest(messagesFor(locale).venue.errors.pricingCourtNotAtVenue);
    }

    const scopes = new Map<string, RuleInput[]>();
    for (const rule of args.rules) {
      const key = rule.courtId ?? "venue";
      scopes.set(key, [...(scopes.get(key) ?? []), rule]);
    }
    for (const scoped of scopes.values()) {
      assertNoOverlap(scoped, locale);
    }

    const existing = await tx
      .select({ id: venuePricingRules.id })
      .from(venuePricingRules)
      .where(eq(venuePricingRules.venueId, args.venueId));
    const existingIds = new Set(existing.map((row) => row.id));
    const reusedIds = new Set<string>();

    await tx
      .delete(venuePricingRules)
      .where(eq(venuePricingRules.venueId, args.venueId));

    if (args.rules.length > 0) {
      await tx.insert(venuePricingRules).values(
        args.rules.map((rule) => {
          const reuse =
            rule.id && existingIds.has(rule.id) && !reusedIds.has(rule.id);
          if (reuse && rule.id) {
            reusedIds.add(rule.id);
          }
          return {
            ...(reuse && rule.id ? { id: rule.id } : {}),
            venueId: args.venueId,
            courtId: rule.courtId ?? null,
            weekdays: [...new Set(rule.weekdays)].sort((a, b) => a - b),
            startMinutes: rule.startMinutes,
            endMinutes: rule.endMinutes,
            hourlyRateFils: rule.hourlyRateFils,
            label: rule.label?.trim() ? rule.label.trim() : null,
          };
        }),
      );
    }

    await tx
      .update(venues)
      .set({ updatedAt: new Date() })
      .where(eq(venues.id, args.venueId));

    return tx
      .select({
        id: venuePricingRules.id,
        courtId: venuePricingRules.courtId,
        weekdays: venuePricingRules.weekdays,
        startMinutes: venuePricingRules.startMinutes,
        endMinutes: venuePricingRules.endMinutes,
        hourlyRateFils: venuePricingRules.hourlyRateFils,
        label: venuePricingRules.label,
      })
      .from(venuePricingRules)
      .where(eq(venuePricingRules.venueId, args.venueId))
      .orderBy(
        asc(venuePricingRules.startMinutes),
        asc(venuePricingRules.createdAt),
      );
  });
}

export const setPricingRulesProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      rules: z
        .array(
          z.object({
            id: z.string().uuid().optional(),
            courtId: z.string().uuid().nullish(),
            weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
            startMinutes: z.number().int(),
            endMinutes: z.number().int(),
            hourlyRateFils: z.number().int(),
            label: z.string().max(MAX_LABEL_LENGTH).nullish(),
          }),
        )
        .max(MAX_RULES),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setPricingRules(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
