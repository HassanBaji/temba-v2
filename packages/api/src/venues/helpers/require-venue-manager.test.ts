import { describe, expect, it } from "vitest";

import { user, venueManagers, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  listManagedVenueIds,
  requireVenueManager,
} from "#src/venues/helpers/require-venue-manager";

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

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

describe("requireVenueManager", () => {
  it("passes for Operator metadata and for a manager row, refuses everyone else", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, "Club A");
      const otherVenue = await insertVenue(db, "Club B");
      const manager = await insertUser(db, "manager@example.com");
      const stranger = await insertUser(db, "stranger@example.com");
      await db
        .insert(venueManagers)
        .values({ venueId: venue.id, userId: manager.id });

      await expect(
        requireVenueManager(db, {
          venueId: venue.id,
          userId: stranger.id,
          publicMetadata: { operator: true },
        }),
      ).resolves.toBeUndefined();
      await expect(
        requireVenueManager(db, {
          venueId: venue.id,
          userId: manager.id,
          publicMetadata: undefined,
        }),
      ).resolves.toBeUndefined();

      await expect(
        requireVenueManager(db, {
          venueId: venue.id,
          userId: stranger.id,
          publicMetadata: { operator: false },
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        requireVenueManager(db, {
          venueId: otherVenue.id,
          userId: manager.id,
          publicMetadata: undefined,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect(await listManagedVenueIds(db, manager.id)).toEqual([venue.id]);
      expect(await listManagedVenueIds(db, stranger.id)).toEqual([]);
    } finally {
      await close();
    }
  });
});
