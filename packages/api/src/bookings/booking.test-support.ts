import {
  bookings,
  courts,
  user,
  venueManagers,
  venueOpeningHours,
  venuePricingRules,
  venues,
} from "@repo/db";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

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
  return row!;
}
