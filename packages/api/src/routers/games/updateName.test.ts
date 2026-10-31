import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, user, venues } from "@repo/db/schema";

import { gameWindowLabel } from "@repo/domain/game-custom-name";

import { createGame } from "#src/routers/games/create";
import { updateGameName } from "#src/routers/games/updateName";
import { updateGameWindow } from "#src/routers/games/updateWindow";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function seed(database: TestDatabase) {
  const [owner] = await database
    .insert(user)
    .values({ name: "Organizer", email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Padel Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!owner || !venue) {
    throw new Error("Failed to seed");
  }
  const [group] = await database
    .insert(groups)
    .values({ name: "Thursday crew", createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to seed");
  }
  return { ownerId: owner.id, venueId: venue.id, groupId: group.id };
}

const windowStart = new Date("2030-11-07T17:00:00.000Z");
const windowEnd = new Date("2030-11-07T18:30:00.000Z");

async function createFriendly(
  database: TestDatabase,
  seeded: Awaited<ReturnType<typeof seed>>,
  customName?: string,
) {
  return createGame(database, {
    createdBy: seeded.ownerId,
    groupId: seeded.groupId,
    venueId: seeded.venueId,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    name: gameWindowLabel(windowStart, windowEnd) ?? undefined,
    customName,
    windowStart,
    windowEnd,
  });
}

async function nameOf(database: TestDatabase, gameId: string) {
  return database.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { name: true, hasCustomName: true },
  });
}

describe("Friendly game custom name", () => {
  it("stores the custom name given at create", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seed(db);
      const created = await createFriendly(db, seeded, "  Thursday Smash ");
      expect(await nameOf(db, created.id)).toEqual({
        name: "Thursday Smash",
        hasCustomName: true,
      });
    } finally {
      await close();
    }
  });

  it("keeps the window label when no custom name is given", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seed(db);
      const created = await createFriendly(db, seeded, "   ");
      expect(await nameOf(db, created.id)).toEqual({
        name: gameWindowLabel(windowStart, windowEnd),
        hasCustomName: false,
      });
    } finally {
      await close();
    }
  });

  it("keeps a custom name when the window moves", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seed(db);
      const created = await createFriendly(db, seeded, "Thursday Smash");
      await updateGameWindow(db, {
        gameId: created.id,
        userId: seeded.ownerId,
        windowStart,
        windowEnd: new Date("2030-11-07T19:00:00.000Z"),
        name: "Thu 8:00 PM - 10:00 PM",
      });
      expect((await nameOf(db, created.id))?.name).toBe("Thursday Smash");
    } finally {
      await close();
    }
  });

  it("sets and clears the custom name after create", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seed(db);
      const created = await createFriendly(db, seeded);
      await updateGameName(db, {
        gameId: created.id,
        userId: seeded.ownerId,
        customName: "Late session",
      });
      expect(await nameOf(db, created.id)).toEqual({
        name: "Late session",
        hasCustomName: true,
      });
      await updateGameName(db, {
        gameId: created.id,
        userId: seeded.ownerId,
        customName: " ",
      });
      expect(await nameOf(db, created.id)).toEqual({
        name: gameWindowLabel(windowStart, windowEnd),
        hasCustomName: false,
      });
    } finally {
      await close();
    }
  });

  it("refuses a rename from someone who is not an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seed(db);
      const created = await createFriendly(db, seeded);
      const [stranger] = await db
        .insert(user)
        .values({ name: "Stranger", email: "stranger@example.com" })
        .returning({ id: user.id });
      await expect(
        updateGameName(db, {
          gameId: created.id,
          userId: stranger!.id,
          customName: "Mine now",
        }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
