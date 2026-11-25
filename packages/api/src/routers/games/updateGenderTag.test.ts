import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, user, venues } from "@repo/db/schema";

import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { updateGameGenderTag } from "#src/routers/games/updateGenderTag";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function createFriendly(database: TestDatabase) {
  const owner = await insertUser(database, "Organizer");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Padel Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [group] = await database
    .insert(groups)
    .values({ name: "Thursday crew", createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const created = await createGame(database, {
    createdBy: owner.id,
    groupId: group.id,
    venueId: venue.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  return { gameId: created.id, ownerId: owner.id };
}

async function genderTagOf(
  database: TestDatabase,
  gameId: string,
  userId: string,
) {
  return (await gameById(database, { gameId, userId })).genderTag;
}

describe("updateGameGenderTag", () => {
  it("lets the Organizer set, change and clear the Gender tag after create", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, ownerId } = await createFriendly(db);
      expect(await genderTagOf(db, gameId, ownerId)).toBeNull();

      for (const genderTag of ["women", "mixed", null] as const) {
        await updateGameGenderTag(db, { gameId, userId: ownerId, genderTag });
        expect(await genderTagOf(db, gameId, ownerId)).toBe(genderTag);
      }
    } finally {
      await close();
    }
  });

  it("refuses a User who does not organize the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, ownerId } = await createFriendly(db);
      const stranger = await insertUser(db, "Stranger");
      await expect(
        updateGameGenderTag(db, {
          gameId,
          userId: stranger.id,
          genderTag: "men",
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(await genderTagOf(db, gameId, ownerId)).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a cancelled Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, ownerId } = await createFriendly(db);
      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, gameId));
      await expect(
        updateGameGenderTag(db, { gameId, userId: ownerId, genderTag: "men" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot edit a cancelled Game",
      });
    } finally {
      await close();
    }
  });
});
