import { describe, expect, it } from "vitest";

import { user, venues } from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  coords?: { latitude?: string | null; longitude?: string | null },
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    })
    .returning({
      id: venues.id,
      latitude: venues.latitude,
      longitude: venues.longitude,
    });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertFriendlyGame(
  database: TestDatabase,
  args: { createdBy: string; venueId: string },
) {
  const windowStart = new Date();
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    venueId: args.venueId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  });
  return created.game;
}

describe("gameById Venue coordinates", () => {
  it("returns the same stored decimals as Venue reads when both are present", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "coords-both@example.com");
      const venue = await insertVenue(db, {
        latitude: "26.228509",
        longitude: "50.58605",
      });
      const game = await insertFriendlyGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const detail = await gameById(db, { gameId: game.id, userId: owner.id });

      expect(detail.venue?.latitude).toEqual(venue.latitude);
      expect(detail.venue?.longitude).toEqual(venue.longitude);
    } finally {
      await close();
    }
  });

  it("returns nullable latitude and longitude when either coordinate is missing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "coords-partial@example.com");
      const missingBoth = await insertVenue(db);
      const missingLng = await insertVenue(db, {
        latitude: "26.228509",
        longitude: null,
      });
      const missingLat = await insertVenue(db, {
        latitude: null,
        longitude: "50.58605",
      });

      const [bothUnset, noLng, noLat] = await Promise.all([
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingBoth.id,
        }),
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingLng.id,
        }),
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingLat.id,
        }),
      ]);

      const [unsetDetail, noLngDetail, noLatDetail] = await Promise.all([
        gameById(db, { gameId: bothUnset.id, userId: owner.id }),
        gameById(db, { gameId: noLng.id, userId: owner.id }),
        gameById(db, { gameId: noLat.id, userId: owner.id }),
      ]);

      expect(unsetDetail.venue?.latitude ?? null).toBeNull();
      expect(unsetDetail.venue?.longitude ?? null).toBeNull();
      expect(noLngDetail.venue?.latitude).toEqual(missingLng.latitude);
      expect(noLngDetail.venue?.longitude ?? null).toBeNull();
      expect(noLatDetail.venue?.latitude ?? null).toBeNull();
      expect(noLatDetail.venue?.longitude).toEqual(missingLat.longitude);
    } finally {
      await close();
    }
  });
});
