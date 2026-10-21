import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  max,
  min,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { bookingPayments, bookings, user } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { classifyLookupQuery } from "#src/invites/search-lookup-users";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export const CUSTOMER_PAGE_SIZE = 50;

const customerSorts = [
  "lastVisit",
  "bookings",
  "noShows",
  "name",
  "owed",
] as const;

export type CustomerSort = (typeof customerSorts)[number];

const sumFils = (expression: SQL) =>
  sql<number>`coalesce(sum(${expression}), 0)`.mapWith(Number);

export async function listVenueCustomers(
  database: DbClient,
  args: {
    venueId: string;
    query?: string;
    sort?: CustomerSort;
    cursor?: number;
    limit?: number;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
) {
  const now = args.now ?? new Date();
  const offset = args.cursor ?? 0;
  const limit = args.limit ?? CUSTOMER_PAGE_SIZE;
  await requireVenueManager(database, { venueId: args.venueId, ...args.actor });

  const paymentTotals = database
    .select({
      bookingId: bookingPayments.bookingId,
      paidFils:
        sql<number>`sum(${bookingPayments.amountFils}) filter (where ${bookingPayments.status} in ('paid', 'refunded', 'partially_refunded'))`.as(
          "paid_fils",
        ),
      refundedFils: sql<number>`sum(${bookingPayments.refundedFils})`.as(
        "refunded_fils",
      ),
    })
    .from(bookingPayments)
    .groupBy(bookingPayments.bookingId)
    .as("payment_totals");

  // A Guest is one phone at this Venue; a User row never carries a guest phone.
  const guestPhone = sql<
    string | null
  >`case when ${bookings.userId} is null then ${bookings.guestPhone} end`;

  // Aggregated over this Venue's Bookings only, so a User appears here only
  // after booking at this Venue, and with this Venue's numbers.
  const customers = database.$with("customers").as(
    database
      .select({
        userId: bookings.userId,
        guestPhone: guestPhone.as("guest_phone"),
        guestName:
          sql<string>`(array_agg(${bookings.guestName} order by ${bookings.createdAt} desc))[1]`.as(
            "guest_name",
          ),
        firstBookingAt: min(bookings.startsAt).as("first_booking_at"),
        lastBookingAt: max(bookings.startsAt).as("last_booking_at"),
        bookingCount: count().as("booking_count"),
        cancelledCount:
          sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.as(
            "cancelled_count",
          ),
        noShowCount:
          sql<number>`count(*) filter (where ${bookings.status} = 'no_show')`.as(
            "no_show_count",
          ),
        paidFils: sumFils(sql`${paymentTotals.paidFils}`).as("paid_fils"),
        refundedFils: sumFils(sql`${paymentTotals.refundedFils}`).as(
          "refunded_fils",
        ),
        // Cancellation charges are information only and never owed (spec Q15).
        owedFils: sumFils(
          sql`case when ${bookings.status} in ('confirmed', 'no_show') and ${bookings.paymentStatus} = 'pending' then ${bookings.priceFils} end`,
        ).as("owed_fils"),
        cancellationChargesFils: sumFils(
          sql`${bookings.cancellationChargeFils}`,
        ).as("cancellation_charges_fils"),
      })
      .from(bookings)
      .leftJoin(paymentTotals, eq(paymentTotals.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.venueId, args.venueId),
          ne(bookings.status, "expired"),
          or(
            ne(bookings.status, "pending_payment"),
            gt(bookings.holdExpiresAt, now),
          ),
        ),
      )
      .groupBy(bookings.userId, guestPhone),
  );

  const displayName = sql<string>`coalesce(${user.name}, ${customers.guestName})`;
  const searchFilter = customerSearchFilter(args.query, {
    displayName,
    username: user.username,
    phone: sql`coalesce(${user.phoneNumber}, ${customers.guestPhone})`,
  });

  const holderKey = sql`coalesce(${customers.userId}::text, ${customers.guestPhone})`;
  const order: Record<CustomerSort, SQL[]> = {
    lastVisit: [desc(customers.lastBookingAt)],
    bookings: [desc(customers.bookingCount), desc(customers.lastBookingAt)],
    noShows: [desc(customers.noShowCount), desc(customers.lastBookingAt)],
    owed: [desc(customers.owedFils), desc(customers.lastBookingAt)],
    name: [asc(sql`lower(${displayName})`)],
  };

  const [rows, [totals]] = await Promise.all([
    database
      .with(customers)
      .select({
        userId: customers.userId,
        guestPhone: customers.guestPhone,
        guestName: customers.guestName,
        name: user.name,
        username: user.username,
        image: user.image,
        phoneNumber: user.phoneNumber,
        firstBookingAt: customers.firstBookingAt,
        lastBookingAt: customers.lastBookingAt,
        bookingCount: customers.bookingCount,
        cancelledCount: customers.cancelledCount,
        noShowCount: customers.noShowCount,
        paidFils: customers.paidFils,
        refundedFils: customers.refundedFils,
        owedFils: customers.owedFils,
        cancellationChargesFils: customers.cancellationChargesFils,
      })
      .from(customers)
      .leftJoin(user, eq(user.id, customers.userId))
      .where(searchFilter)
      .orderBy(...order[args.sort ?? "lastVisit"], asc(holderKey))
      .limit(limit + 1)
      .offset(offset),
    database
      .with(customers)
      .select({ total: count() })
      .from(customers)
      .leftJoin(user, eq(user.id, customers.userId))
      .where(searchFilter),
  ]);

  const page = rows.slice(0, limit);
  return {
    customers: page.map((row) => ({
      kind: row.userId ? ("user" as const) : ("guest" as const),
      userId: row.userId,
      name: row.userId ? (row.name ?? "") : row.guestName,
      username: row.userId ? row.username : null,
      image: row.userId ? row.image : null,
      phone: row.userId ? row.phoneNumber : row.guestPhone,
      firstBookingAt: new Date(row.firstBookingAt!),
      lastBookingAt: new Date(row.lastBookingAt!),
      bookingCount: Number(row.bookingCount),
      cancelledCount: Number(row.cancelledCount),
      noShowCount: Number(row.noShowCount),
      paidFils: Number(row.paidFils),
      refundedFils: Number(row.refundedFils),
      owedFils: Number(row.owedFils),
      cancellationChargesFils: Number(row.cancellationChargesFils),
    })),
    total: totals?.total ?? 0,
    nextCursor: rows.length > limit ? offset + limit : null,
  };
}

function customerSearchFilter(
  raw: string | undefined,
  columns: { displayName: SQL; username: typeof user.username; phone: SQL },
) {
  const classified = classifyLookupQuery(raw ?? "");
  if (!classified.query) {
    return undefined;
  }
  const pattern = `%${classified.query}%`;
  const filters = [
    ilike(columns.displayName, pattern),
    ilike(columns.username, pattern),
  ];
  if (classified.phoneStripped) {
    filters.push(
      sql`regexp_replace(coalesce(${columns.phone}, ''), '[()[:space:]-]', '', 'g') ilike ${`%${classified.phoneStripped}%`}`,
    );
  }
  return or(...filters);
}

export const listCustomersProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      query: z.string().trim().max(100).optional(),
      sort: z.enum(customerSorts).default("lastVisit"),
      cursor: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listVenueCustomers(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
