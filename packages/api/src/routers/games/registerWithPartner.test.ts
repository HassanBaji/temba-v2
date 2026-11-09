import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { gameWaitlist, games, groups, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { createFriendlyGame } from "#src/games/create-friendly";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";

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

async function insertPublicFriendly(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert Venue or Group");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  await database
    .update(games)
    .set({ isPublic: true })
    .where(eq(games.id, created.game.id));
  return created.game;
}

describe("registerWithPartner", () => {
  it("refuses a full Game instead of waitlisting the pair", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "Owner");
      const game = await insertPublicFriendly(db, organizer.id);
      const seats = [
        [organizer.id, 1, "left"],
        [(await insertUser(db, "Bea")).id, 1, "right"],
        [(await insertUser(db, "Cyd")).id, 2, "left"],
        [(await insertUser(db, "Dov")).id, 2, "right"],
      ] as const;
      for (const [userId, sideIndex, position] of seats) {
        await registerSeat(db, {
          gameId: game.id,
          userId,
          sideIndex,
          position,
        });
      }
      const caller = await insertUser(db, "Caller");
      const partner = await insertUser(db, "Partner");

      await expect(
        registerWithPartner(db, {
          gameId: game.id,
          userId: caller.id,
          partnerUserId: partner.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow(messagesFor("en").game.errors.partnerWaitlist);

      const waitlist = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, game.id),
      });
      expect(waitlist).toEqual([]);
    } finally {
      await close();
    }
  });
});
