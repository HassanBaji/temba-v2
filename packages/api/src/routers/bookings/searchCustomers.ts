import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { bookings, user } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  classifyLookupQuery,
  containsPattern,
  exactContactFilter,
  LOOKUP_USER_SEARCH_LIMIT,
  normalizedPhoneSql,
  type ClassifiedLookupQuery,
} from "#src/invites/search-lookup-users";
import { protectedProcedure } from "#src/trpc";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { notUnclaimedUserSql } from "#src/unclaimed-players/is-unclaimed";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const GUEST_LIMIT = 10;

const userColumns = {
  id: true,
  name: true,
  username: true,
  image: true,
  phoneNumber: true,
} as const;

function customerTextFilter(classified: ClassifiedLookupQuery) {
  const pattern = containsPattern(classified.query);
  const filters: (SQL | undefined)[] = [
    ilike(user.name, pattern),
    ilike(user.username, pattern),
    exactContactFilter(classified),
  ];
  if (classified.phoneStripped) {
    filters.push(
      ilike(
        normalizedPhoneSql(user.phoneNumber),
        containsPattern(classified.phoneStripped),
      ),
    );
  }
  return or(...filters);
}

/**
 * This Venue's Customers match as its own records do, by name or part of a
 * number. Anyone else on Temba is found only by their full phone number.
 */
async function matchingUsers(
  database: DbClient,
  classified: ClassifiedLookupQuery,
  customerIds: string[],
) {
  const customers =
    customerIds.length > 0
      ? await database.query.user.findMany({
          where: and(
            inArray(user.id, customerIds),
            notUnclaimedUserSql,
            customerTextFilter(classified),
          ),
          columns: userColumns,
          orderBy: (table, { asc }) => [asc(table.name), asc(table.username)],
          limit: LOOKUP_USER_SEARCH_LIMIT,
        })
      : [];
  const phoneMatch = exactContactFilter(classified, { email: false });
  const remaining = LOOKUP_USER_SEARCH_LIMIT - customers.length;
  const others =
    phoneMatch && remaining > 0
      ? await database.query.user.findMany({
          where: and(
            customerIds.length > 0
              ? notInArray(user.id, customerIds)
              : undefined,
            notUnclaimedUserSql,
            phoneMatch,
          ),
          columns: userColumns,
          orderBy: (table, { asc }) => [asc(table.name), asc(table.username)],
          limit: remaining,
        })
      : [];
  return [...customers, ...others];
}

export async function searchVenueCustomers(
  database: DbClient,
  args: {
    venueId: string;
    query: string;
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

  const bookingCounts = await database
    .select({ userId: bookings.userId, bookingCount: count() })
    .from(bookings)
    .where(and(eq(bookings.venueId, args.venueId), isNotNull(bookings.userId)))
    .groupBy(bookings.userId);
  const countByUserId = new Map(
    bookingCounts.map((row) => [row.userId!, row.bookingCount]),
  );

  const classified = classifyLookupQuery(args.query);
  const users = await matchingUsers(database, classified, [
    ...countByUserId.keys(),
  ]);

  const guestFilters = [
    ilike(bookings.guestName, containsPattern(classified.query)),
  ];
  if (classified.phoneStripped) {
    guestFilters.push(
      ilike(
        normalizedPhoneSql(bookings.guestPhone),
        containsPattern(classified.phoneStripped),
      ),
    );
  }
  const guests = await database
    .select({
      phone: bookings.guestPhone,
      name: sql<string>`(array_agg(${bookings.guestName} order by ${bookings.createdAt} desc))[1]`,
      bookingCount: count(),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, args.venueId),
        isNotNull(bookings.guestPhone),
        or(...guestFilters),
      ),
    )
    .groupBy(bookings.guestPhone)
    .orderBy(desc(count()))
    .limit(GUEST_LIMIT);

  return [
    // A Customer of this Venue shows their phone; anyone else matched only on
    // the number the manager typed in full.
    ...users.map((row) => ({
      kind: "user" as const,
      userId: row.id,
      name: row.name,
      username: row.username,
      phone: row.phoneNumber,
      image: row.image,
      bookingCount: countByUserId.get(row.id) ?? 0,
    })),
    ...guests.map((row) => ({
      kind: "guest" as const,
      name: row.name,
      phone: row.phone ?? "",
      bookingCount: row.bookingCount,
    })),
  ];
}

export const searchCustomersProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      query: z.string().trim().min(2).max(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.lookupSearch, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return searchVenueCustomers(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
