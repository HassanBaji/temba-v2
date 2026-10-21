import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { bookings, user } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  classifyLookupQuery,
  searchLookupUsers,
} from "#src/invites/search-lookup-users";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const GUEST_LIMIT = 10;

export async function searchVenueCustomers(
  database: DbClient,
  args: {
    venueId: string;
    query: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  await requireVenueManager(database, { venueId: args.venueId, ...args.actor });

  const bookingCounts = await database
    .select({ userId: bookings.userId, bookingCount: count() })
    .from(bookings)
    .where(and(eq(bookings.venueId, args.venueId), isNotNull(bookings.userId)))
    .groupBy(bookings.userId);
  const countByUserId = new Map(
    bookingCounts.map((row) => [row.userId!, row.bookingCount]),
  );

  const users = await searchLookupUsers(database, {
    query: args.query,
    excludeUserIds: [],
    boostUserIds: [...countByUserId.keys()],
  });
  const details = users.length
    ? await database
        .select({
          id: user.id,
          image: user.image,
          phoneNumber: user.phoneNumber,
        })
        .from(user)
        .where(
          inArray(
            user.id,
            users.map((row) => row.id),
          ),
        )
    : [];
  const detailById = new Map(details.map((row) => [row.id, row]));

  const classified = classifyLookupQuery(args.query);
  const guestFilters = [ilike(bookings.guestName, `%${classified.query}%`)];
  if (classified.phoneStripped) {
    guestFilters.push(
      sql`regexp_replace(${bookings.guestPhone}, '[()[:space:]-]', '', 'g') ilike ${`%${classified.phoneStripped}%`}`,
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
    ...users.map((row) => {
      const bookingCount = countByUserId.get(row.id) ?? 0;
      const detail = detailById.get(row.id);
      return {
        kind: "user" as const,
        userId: row.id,
        name: row.name,
        username: row.username,
        // A Customer of this Venue shows their phone; anyone else only when
        // the manager already typed it.
        phone:
          bookingCount > 0 ? (detail?.phoneNumber ?? null) : row.phoneNumber,
        image: detail?.image ?? null,
        bookingCount,
      };
    }),
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
    const appUser = await resolveAppUser(ctx.userId);
    return searchVenueCustomers(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
