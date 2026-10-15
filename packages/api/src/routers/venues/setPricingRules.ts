import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { courts, venuePricingRules, venues } from "@repo/db";
import type { DbClient } from "@repo/db";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";

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

function validateRule(rule: RuleInput, slotMinutes: number) {
  if (
    rule.weekdays.length === 0 ||
    rule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    badRequest("Choose at least one weekday, between 0 (Sunday) and 6");
  }
  if (
    !Number.isInteger(rule.startMinutes) ||
    !Number.isInteger(rule.endMinutes) ||
    rule.startMinutes < 0
  ) {
    badRequest("Pricing times must be whole minutes from midnight");
  }
  if (rule.endMinutes <= rule.startMinutes) {
    badRequest("A Pricing rule must end after it starts");
  }
  if (rule.endMinutes > MAX_END_MINUTES) {
    badRequest("A Pricing rule cannot run later than 06:00 the next day");
  }
  if (
    rule.startMinutes % slotMinutes !== 0 ||
    rule.endMinutes % slotMinutes !== 0
  ) {
    badRequest(`Times must fall on the ${slotMinutes}-minute grid`);
  }
  if (!Number.isInteger(rule.hourlyRateFils) || rule.hourlyRateFils < 0) {
    badRequest("The hourly rate cannot be negative");
  }
  if (rule.hourlyRateFils > PRICE_PER_PLAYER_MAX_FILS) {
    badRequest("The hourly rate is too large");
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

function assertNoOverlap(rules: RuleInput[]) {
  const occupancy = weekOccupancy(rules);
  for (let first = 0; first < occupancy.length; first += 1) {
    for (let second = first + 1; second < occupancy.length; second += 1) {
      const a = occupancy[first]!;
      const b = occupancy[second]!;
      const overlaps = [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK].some(
        (shift) => a.start < b.end + shift && b.start + shift < a.end,
      );
      if (overlaps) {
        badRequest(
          "Pricing rules for the same Courts must not overlap in weekday and time",
        );
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
  },
) {
  if (args.rules.length > MAX_RULES) {
    badRequest(`A Venue can have at most ${MAX_RULES} Pricing rules`);
  }

  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  return database.transaction(async (tx) => {
    const [venue] = await tx
      .select({ id: venues.id, slotMinutes: venues.slotMinutes })
      .from(venues)
      .where(eq(venues.id, args.venueId))
      .for("update");

    if (!venue) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    }

    for (const rule of args.rules) {
      validateRule(rule, venue.slotMinutes);
      if ((rule.label?.trim().length ?? 0) > MAX_LABEL_LENGTH) {
        badRequest(`Labels can be at most ${MAX_LABEL_LENGTH} characters`);
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
      badRequest("A Pricing rule names a Court that is not in this Venue");
    }

    const scopes = new Map<string, RuleInput[]>();
    for (const rule of args.rules) {
      const key = rule.courtId ?? "venue";
      scopes.set(key, [...(scopes.get(key) ?? []), rule]);
    }
    for (const scoped of scopes.values()) {
      assertNoOverlap(scoped);
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
    });
  });
