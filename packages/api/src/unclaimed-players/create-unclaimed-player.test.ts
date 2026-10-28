import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { ratings, user } from "@repo/db/schema";

import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertOrganizer(database: TestDatabase) {
  const [row] = await database
    .insert(user)
    .values({
      name: "Organizer",
      email: "organizer@example.com",
      clerkId: "user_organizer",
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert organizer");
  }
  return row.id;
}

async function ratingsFor(database: TestDatabase, userId: string) {
  return database.query.ratings.findMany({
    where: eq(ratings.userId, userId),
  });
}

describe("createUnclaimedPlayer", () => {
  it("writes an Unclaimed row and one padel Rating at the picked band", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizerId = await insertOrganizer(db);

      const created = await db.transaction((tx) =>
        createUnclaimedPlayer(tx, {
          phoneNumber: "+97336124408",
          name: "Ali",
          addedByUserId: organizerId,
          startingLevel: { sport: "padel", level: "C+" },
        }),
      );

      const row = await db.query.user.findFirst({
        where: eq(user.id, created.user.id),
      });
      expect(row).toMatchObject({
        name: "Ali",
        phoneNumber: "+97336124408",
        clerkId: null,
        email: null,
        addedByUserId: organizerId,
        claimedAt: null,
      });
      expect(row?.addedAt).toBeInstanceOf(Date);
      expect(isUnclaimed(row!)).toBe(true);

      const rows = await ratingsFor(db, created.user.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ sport: "padel", levelBand: "C1" });
      expect(rows[0]?.selfDeclaredAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });

  it("starts a padel Not sure at D+", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizerId = await insertOrganizer(db);

      const created = await createUnclaimedPlayer(db, {
        phoneNumber: "+97336124409",
        name: "Not Sure",
        addedByUserId: organizerId,
        startingLevel: { sport: "padel", level: "not_sure" },
      });

      const rows = await ratingsFor(db, created.user.id);
      expect(rows.map((rating) => [rating.sport, rating.levelBand])).toEqual([
        ["padel", "D1"],
      ]);
    } finally {
      await close();
    }
  });

  it("writes one football Rating from the self-placement", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizerId = await insertOrganizer(db);

      const created = await createUnclaimedPlayer(db, {
        phoneNumber: "+97336124410",
        name: "Keeper",
        addedByUserId: organizerId,
        startingLevel: { sport: "football", placement: "beginner" },
      });

      const rows = await ratingsFor(db, created.user.id);
      expect(rows.map((rating) => [rating.sport, rating.levelBand])).toEqual([
        ["football", "D3"],
      ]);
    } finally {
      await close();
    }
  });

  it("leaves nothing behind when the caller's transaction rolls back", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizerId = await insertOrganizer(db);

      await expect(
        db.transaction(async (tx) => {
          await createUnclaimedPlayer(tx, {
            phoneNumber: "+97336124411",
            name: "Rolled Back",
            addedByUserId: organizerId,
            startingLevel: { sport: "padel", level: "not_sure" },
          });
          throw new TRPCError({ code: "CONFLICT", message: "Game is full" });
        }),
      ).rejects.toThrow("Game is full");

      expect(
        await db.query.user.findFirst({
          where: eq(user.phoneNumber, "+97336124411"),
        }),
      ).toBeUndefined();
      expect(await db.query.ratings.findMany()).toEqual([]);
    } finally {
      await close();
    }
  });
});
