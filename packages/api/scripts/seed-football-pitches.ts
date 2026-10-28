/**
 * Adds the Bahrain football pitches in ./football-pitches.ts as Venues with
 * football Courts. Unlike db:seed it wipes nothing: a Venue whose name, city
 * and country already exist is left untouched, so the script is safe to rerun
 * and never overwrites what an Operator has since edited.
 *
 * Venues are created closed for bookings and without managers.
 *
 * Run: pnpm --filter @repo/api db:seed:football-pitches
 */
import { and, sql } from "drizzle-orm";

import { venues } from "@repo/db";

import { db } from "#src/db";

import { addCourt } from "#src/routers/venues/addCourt";
import { createVenue } from "#src/routers/venues/create";
import { updateVenueDetails } from "#src/routers/venues/updateDetails";

import {
  FOOTBALL_PITCH_VENUES,
  FOOTBALL_PITCHES_COUNTRY,
  type FootballPitchVenue,
} from "./football-pitches";

const operator = { userId: "seed", publicMetadata: { operator: true } };

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "an unknown host";
  }
}

async function venueExists(entry: FootballPitchVenue) {
  const [row] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        sql`lower(btrim(${venues.name})) = lower(${entry.name})`,
        sql`lower(btrim(${venues.city})) = lower(${entry.city})`,
        sql`lower(btrim(${venues.country})) = lower(${FOOTBALL_PITCHES_COUNTRY})`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function seedVenue(entry: FootballPitchVenue) {
  const venue = await createVenue(db, {
    name: entry.name,
    city: entry.city,
    country: FOOTBALL_PITCHES_COUNTRY,
    latitude: entry.latitude,
    longitude: entry.longitude,
  });
  if (entry.phone || entry.website) {
    await updateVenueDetails(db, {
      venueId: venue.id,
      ...operator,
      phone: entry.phone,
      website: entry.website,
    });
  }
  for (const name of entry.courts) {
    await addCourt(db, {
      venueId: venue.id,
      name,
      sport: "football",
      actor: operator,
    });
  }
}

async function main() {
  console.log(
    `Seeding ${FOOTBALL_PITCH_VENUES.length} football Venues into ${databaseHost()}…`,
  );
  let created = 0;
  let courts = 0;
  const skipped: string[] = [];
  for (const entry of FOOTBALL_PITCH_VENUES) {
    if (await venueExists(entry)) {
      skipped.push(`${entry.name}, ${entry.city}`);
      continue;
    }
    try {
      await seedVenue(entry);
    } catch (error) {
      console.error(`\n✗ ${entry.name}, ${entry.city}`);
      throw error;
    }
    created += 1;
    courts += entry.courts.length;
  }

  console.log(`\nCreated ${created} Venues with ${courts} football Courts.`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} that already exist:`);
    for (const venue of skipped) console.log(`  ${venue}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
