import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, expect } from "vitest";

import type { Db } from "@repo/db";
import {
  bookingPayments,
  bookings,
  courts,
  user,
  venueManagers,
  venueOpeningHours,
  venuePricingRules,
  venues,
} from "@repo/db";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import {
  summarisePaymentStatus,
  type BookingPaymentMethod,
} from "@repo/domain/booking-payment";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import { handle as createCharge } from "#src/jobs/handlers/payment.create-charge";
import { createBooking } from "#src/routers/bookings/create";
import { resetJobSink, setJobSink } from "#src/jobs/enqueue";
import { RecordingJobSink } from "#src/jobs/job-sink.test-support";
import { resetPaymentProvider, setPaymentProvider } from "#src/payments/index";
import { FakePaymentProvider } from "#src/payments/fake.test-support";

// 2030-01-05 is a Saturday.
export const NOW = zonedDateTimeToInstant({
  year: 2030,
  month: 1,
  day: 5,
  hour: 12,
});

export function at(day: number, hour: number, minute = 0) {
  return zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });
}

export const VENUE_PHONE = "+973 1700 0000";

export async function seedBookableVenue(database: TestDatabase) {
  const [customer, other, manager] = await database
    .insert(user)
    .values([
      { name: "Customer", email: "customer@example.com" },
      { name: "Other", email: "other@example.com" },
      { name: "Manager", email: "manager@example.com" },
    ])
    .returning({ id: user.id });
  const [venue, elsewhere] = await database
    .insert(venues)
    .values([
      {
        name: "Padel Central",
        city: "Manama",
        country: "BH",
        phone: VENUE_PHONE,
        acceptingBookings: true,
      },
      { name: "Elsewhere", city: "Riffa", country: "BH" },
    ])
    .returning({ id: venues.id });
  if (!customer || !other || !manager || !venue || !elsewhere) {
    throw new Error("seed failed");
  }
  const [court1, court2, elsewhereCourt] = await database
    .insert(courts)
    .values([
      { venueId: venue.id, name: "Court 1" },
      { venueId: venue.id, name: "Court 2" },
      { venueId: elsewhere.id, name: "Court X" },
    ])
    .returning({ id: courts.id });
  if (!court1 || !court2 || !elsewhereCourt) {
    throw new Error("seed failed");
  }
  await database.insert(venueOpeningHours).values(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      venueId: venue.id,
      weekday,
      opensAtMinutes: 8 * 60,
      closesAtMinutes: 23 * 60,
    })),
  );
  await database.insert(venuePricingRules).values({
    venueId: venue.id,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startMinutes: 0,
    endMinutes: 1440,
    hourlyRateFils: 10_000,
  });
  await database
    .insert(venueManagers)
    .values({ venueId: venue.id, userId: manager.id });

  return {
    venueId: venue.id,
    elsewhereVenueId: elsewhere.id,
    court1: court1.id,
    court2: court2.id,
    elsewhereCourt: elsewhereCourt.id,
    customer: customer.id,
    other: other.id,
    manager: manager.id,
  };
}

export type BookableFixture = Awaited<ReturnType<typeof seedBookableVenue>>;

export async function withBookableVenue(
  run: (database: TestDatabase, fixture: BookableFixture) => Promise<void>,
) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, await seedBookableVenue(db));
  } finally {
    await close();
  }
}

/** Routes `enqueue` to a recording sink for the tests in the calling suite. */
export function recordJobs() {
  const sink = new RecordingJobSink();
  beforeEach(() => {
    sink.clear();
    setJobSink(sink);
  });
  afterEach(() => resetJobSink());
  return sink;
}

/** Installs a fresh scripted provider for the tests in the calling suite. */
export function useFakeProvider() {
  const holder = { fake: new FakePaymentProvider() };
  beforeEach(() => {
    holder.fake = new FakePaymentProvider();
    setPaymentProvider(holder.fake);
  });
  afterEach(() => resetPaymentProvider());
  return holder;
}

/** Invariant 11: the stored summary equals the one re-derived from the rows. */
export async function expectLedgerConsistent(
  database: TestDatabase,
  bookingId: string,
) {
  const rows = await database
    .select({
      status: bookingPayments.status,
      createdAt: bookingPayments.createdAt,
    })
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(asc(bookingPayments.createdAt));
  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: { paymentStatus: true },
  });
  expect(booking?.paymentStatus).toBe(summarisePaymentStatus(rows));
}

export async function insertPayment(
  database: TestDatabase,
  bookingId: string,
  patch: Partial<typeof bookingPayments.$inferInsert> = {},
) {
  const [row] = await database
    .insert(bookingPayments)
    .values({
      bookingId,
      provider: "manual",
      amountFils: 10_000,
      ...patch,
    })
    .returning();
  return row!;
}

export async function insertBooking(
  database: TestDatabase,
  fixture: BookableFixture,
  patch: Partial<typeof bookings.$inferInsert> = {},
) {
  const [row] = await database
    .insert(bookings)
    .values({
      venueId: fixture.venueId,
      courtId: fixture.court1,
      userId: fixture.customer,
      startsAt: at(7, 18),
      endsAt: at(7, 19),
      status: "confirmed",
      source: "app",
      priceFils: 10_000,
      cancellationPolicy: {
        tiers: [{ hoursBefore: 24, refundPercent: 100 }],
        lateRefundPercent: 0,
        customerCancelUntilMinutes: 0,
      },
      ...patch,
    })
    .returning();
  if (patch.paymentStatus === "paid") {
    await insertPayment(database, row!.id, {
      status: "paid",
      method: "cash",
      amountFils: row!.priceFils,
      settledAt: row!.createdAt,
    });
  }
  return row!;
}

/** A Customer booking made while the scripted provider is installed. */
export function createHeldBooking(
  database: TestDatabase,
  fixture: BookableFixture,
  patch: {
    courtId?: string;
    userId?: string;
    day?: number;
    hour?: number;
    paymentMethod?: BookingPaymentMethod;
  } = {},
) {
  return createBooking(asDb(database), {
    venueId: fixture.venueId,
    courtId: patch.courtId ?? fixture.court1,
    startsAt: at(patch.day ?? 7, patch.hour ?? 18),
    durationMinutes: 60,
    paymentMethod: patch.paymentMethod,
    userId: patch.userId ?? fixture.customer,
    now: NOW,
  });
}

export function jobNames(sink: RecordingJobSink) {
  return sink.added.map((job) => job.name);
}

export const asDb = (database: TestDatabase) => database as unknown as Db;

/** A pending_payment Booking whose charge the create-charge job has opened. */
export async function chargedBooking(
  database: TestDatabase,
  fixture: BookableFixture,
) {
  const { booking } = await createHeldBooking(database, fixture);
  const [created] = await database.select().from(bookingPayments);
  await createCharge(
    asDb(database),
    { paymentId: created!.id },
    undefined,
    NOW,
  );
  const payment = await database.query.bookingPayments.findFirst({
    where: eq(bookingPayments.id, created!.id),
  });
  return { booking, payment: payment! };
}
