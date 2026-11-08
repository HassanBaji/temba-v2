import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { challenges, WEEKDAY_VALUES } from "@repo/db";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { sportSchema } from "@repo/validators/sport";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadChallengeCards,
  type ChallengeCard,
} from "#src/challenges/challenge-cards";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const levelTenths = z
  .number()
  .int()
  .min(LEVEL_TENTHS_MIN)
  .max(LEVEL_TENTHS_MAX);

export const listOpenInput = z
  .object({
    sport: sportSchema.optional(),
    levelMinTenths: levelTenths.optional(),
    levelMaxTenths: levelTenths.optional(),
    area: z.string().trim().min(1).max(255).optional(),
    weekday: z.enum(WEEKDAY_VALUES).optional(),
  })
  .default({});

export type ListOpenFilters = z.infer<typeof listOpenInput>;

function sameCity(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function overlapsLevel(card: ChallengeCard, filters: ListOpenFilters) {
  if (filters.levelMinTenths == null && filters.levelMaxTenths == null) {
    return true;
  }
  const min = card.levelMinTenths ?? LEVEL_TENTHS_MIN;
  const max = card.levelMaxTenths ?? LEVEL_TENTHS_MAX;
  return (
    min <= (filters.levelMaxTenths ?? LEVEL_TENTHS_MAX) &&
    max >= (filters.levelMinTenths ?? LEVEL_TENTHS_MIN)
  );
}

/** Area is a preferred Venue's city; a Challenge with no Venue is anywhere. */
function inArea(card: ChallengeCard, area: string | undefined) {
  return (
    !area ||
    card.venues.length === 0 ||
    card.venues.some((venue) => sameCity(venue.city, area))
  );
}

/** Days are any day when empty. */
function onDay(card: ChallengeCard, weekday: ListOpenFilters["weekday"]) {
  return !weekday || card.days.length === 0 || card.days.includes(weekday);
}

/**
 * The Open board: every open Challenge, newest first, each with the poster
 * Team, its Team Level and record, and which of the viewer's Teams may
 * propose. `areas` lists the preferred Venues' cities for the Area filter.
 */
export async function listOpen(
  database: DbClient,
  args: { userId: string; filters?: ListOpenFilters; now?: Date },
) {
  const now = args.now ?? new Date();
  const filters = args.filters ?? {};
  const rows = await database.query.challenges.findMany({
    where: and(
      eq(challenges.status, "open"),
      filters.sport ? eq(challenges.sport, filters.sport) : undefined,
    ),
    orderBy: [desc(challenges.createdAt), desc(challenges.id)],
  });
  const open = (
    await loadChallengeCards(database, rows, { userId: args.userId, now })
  ).filter((card) => card.state === "open");
  const areas = [
    ...new Map(
      open
        .flatMap((card) => card.venues.map((venue) => venue.city.trim()))
        .map((city) => [city.toLowerCase(), city] as const),
    ).values(),
  ].sort((a, b) => a.localeCompare(b));
  return {
    challenges: open.filter(
      (card) =>
        overlapsLevel(card, filters) &&
        inArea(card, filters.area) &&
        onDay(card, filters.weekday),
    ),
    areas,
  };
}

export const listOpenProcedure = protectedProcedure
  .input(listOpenInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listOpen(ctx.db, { userId: appUser.id, filters: input });
  });
