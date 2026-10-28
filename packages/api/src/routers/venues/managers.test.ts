import { describe, expect, it } from "vitest";

import { user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { addManager } from "#src/routers/venues/addManager";
import { listManaged } from "#src/routers/venues/listManaged";
import { managedVenueById } from "#src/routers/venues/managedById";
import { removeManager } from "#src/routers/venues/removeManager";
import { searchManagerUsers } from "#src/routers/venues/searchManagerUsers";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com` })
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

describe("Venue manager doors", () => {
  it("adds a manager once, then CONFLICT, and removes idempotently", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, "Club A");
      const operator = await insertUser(db, "Operator");
      const manager = await insertUser(db, "Manager");

      const created = await addManager(db, {
        venueId: venue.id,
        userId: manager.id,
        grantedByUserId: operator.id,
      });
      expect(created.grantedByUserId).toBe(operator.id);

      await expect(
        addManager(db, {
          venueId: venue.id,
          userId: manager.id,
          grantedByUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await expect(
        addManager(db, {
          venueId: crypto.randomUUID(),
          userId: manager.id,
          grantedByUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await removeManager(db, { venueId: venue.id, userId: manager.id });
      await expect(
        removeManager(db, { venueId: venue.id, userId: manager.id }),
      ).resolves.toEqual({ ok: true });
    } finally {
      await close();
    }
  });

  it("listManaged returns managed Venues, every Venue for an Operator, else none", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const managed = await insertVenue(db, "Club A");
      await insertVenue(db, "Club B");
      const manager = await insertUser(db, "Manager");
      const stranger = await insertUser(db, "Stranger");
      await addManager(db, {
        venueId: managed.id,
        userId: manager.id,
        grantedByUserId: null,
      });

      const asManager = await listManaged(db, {
        userId: manager.id,
        publicMetadata: undefined,
      });
      expect(asManager.map((row) => row.id)).toEqual([managed.id]);

      const asOperator = await listManaged(db, {
        userId: stranger.id,
        publicMetadata: { operator: true },
      });
      expect(asOperator).toHaveLength(2);

      expect(
        await listManaged(db, {
          userId: stranger.id,
          publicMetadata: undefined,
        }),
      ).toEqual([]);
    } finally {
      await close();
    }
  });

  it("managedById is gated and lists managers with default settings", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, "Club A");
      const manager = await insertUser(db, "Manager");
      const stranger = await insertUser(db, "Stranger");
      await addManager(db, {
        venueId: venue.id,
        userId: manager.id,
        grantedByUserId: null,
      });

      const result = await managedVenueById(db, {
        venueId: venue.id,
        userId: manager.id,
        publicMetadata: undefined,
      });
      expect(result.acceptingBookings).toBe(false);
      expect(result.slotMinutes).toBe(30);
      expect(result.durationOptionsMinutes).toEqual([60, 90]);
      expect(result.managers.map((row) => row.userId)).toEqual([manager.id]);

      await expect(
        managedVenueById(db, {
          venueId: venue.id,
          userId: stranger.id,
          publicMetadata: undefined,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await close();
    }
  });

  it("searchManagerUsers finds Users by name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const found = await insertUser(db, "Zainab");
      await insertUser(db, "Other");

      const rows = await searchManagerUsers(db, { query: "zain" });
      expect(rows.map((row) => row.id)).toEqual([found.id]);
      expect(rows[0]).toMatchObject({ name: "Zainab", image: null });
    } finally {
      await close();
    }
  });
});
