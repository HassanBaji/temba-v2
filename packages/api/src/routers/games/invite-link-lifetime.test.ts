import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  gameInviteLinks,
  games,
  GameFormatEnum,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { getInviteLink } from "#src/routers/games/getInviteLink";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";
const HOUR = 60 * 60 * 1000;

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

async function insertFriendlyGame(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Lifetime Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const windowStart = new Date(Date.now() + 3 * 24 * HOUR);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue.id,
      createdBy,
      isPublic: true,
      playersAllowed: 4,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: game.id });
  return game;
}

async function mintFor(
  database: TestDatabase,
  gameId: string,
  organizerId: string,
) {
  const created = await createInviteLink(database, {
    gameId,
    userId: organizerId,
    origin: ORIGIN,
  });
  const row = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.id, created.id),
  });
  if (!row) {
    throw new Error("Invite link row missing");
  }
  return { created, token: row.token };
}

describe("Game Invite link lifetime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps working past six hours while the Game is open for registration", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "lifetime-organizer@example.com");
      const invitee = await insertUser(db, "lifetime-invitee@example.com");
      const game = await insertFriendlyGame(db, organizer.id);
      const { created, token } = await mintFor(db, game.id, organizer.id);
      expect(created.expiresAt).toEqual(game.windowEnd);

      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + 7 * HOUR);

      expect(
        await getInviteLink(db, {
          gameId: game.id,
          userId: organizer.id,
          origin: ORIGIN,
        }),
      ).toMatchObject({ id: created.id });
      expect(
        await acceptInviteLink(db, {
          token,
          userId: invitee.id,
          sideIndex: 1,
          position: "left",
        }),
      ).toMatchObject({ gameId: game.id, outcome: "registered" });
    } finally {
      await close();
    }
  });

  it("stops working once the Game window has ended", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "ended-organizer@example.com");
      const invitee = await insertUser(db, "ended-invitee@example.com");
      const game = await insertFriendlyGame(db, organizer.id);
      const { token } = await mintFor(db, game.id, organizer.id);

      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(game.windowEnd!.getTime() + 1000);

      expect(
        await getInviteLink(db, {
          gameId: game.id,
          userId: organizer.id,
          origin: ORIGIN,
        }),
      ).toBeNull();
      await expect(
        acceptInviteLink(db, {
          token,
          userId: invitee.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow("This Game is not open for registration");
    } finally {
      await close();
    }
  });

  it("stops working once registration is closed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "closed-organizer@example.com");
      const invitee = await insertUser(db, "closed-invitee@example.com");
      const game = await insertFriendlyGame(db, organizer.id);
      const { token } = await mintFor(db, game.id, organizer.id);
      await db
        .update(games)
        .set({ registrationClosedAt: new Date() })
        .where(eq(games.id, game.id));

      expect(
        await getInviteLink(db, {
          gameId: game.id,
          userId: organizer.id,
          origin: ORIGIN,
        }),
      ).toBeNull();
      await expect(
        acceptInviteLink(db, {
          token,
          userId: invitee.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow("This Game is not open for registration");
    } finally {
      await close();
    }
  });
});
