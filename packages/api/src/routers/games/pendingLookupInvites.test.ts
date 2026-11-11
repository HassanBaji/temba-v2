import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  gameMemberInvites,
  games,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { pendingLookupInvites } from "#src/routers/games/pendingLookupInvites";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertFriendlyGame(
  database: TestDatabase,
  createdBy: string,
  venueName: string,
) {
  const [venue] = await database
    .insert(venues)
    .values({ name: venueName, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue!.id,
      createdBy,
      playersAllowed: 4,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
    })
    .returning({ id: games.id });
  await database.insert(matches).values({ gameId: game!.id });
  return game!;
}

describe("games.pendingLookupInvites", () => {
  it("leaves out invites to cancelled Games and never carries the inviter's email", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "game-organizer@example.com");
      const invitee = await insertUser(db, "game-invitee@example.com");
      const live = await insertFriendlyGame(db, organizer.id, "Ocean Padel");
      const cancelled = await insertFriendlyGame(db, organizer.id, "Bay Padel");
      await db.insert(gameMemberInvites).values(
        [live, cancelled].map((game) => ({
          gameId: game.id,
          userId: invitee.id,
          invitedBy: organizer.id,
        })),
      );
      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, cancelled.id));

      const rows = await pendingLookupInvites(db, { userId: invitee.id });
      expect(rows.map((row) => row.gameId)).toEqual([live.id]);
      expect(rows[0]?.invitedBy).toEqual({
        id: organizer.id,
        name: organizer.name,
        image: null,
      });
      expect(JSON.stringify(rows)).not.toContain("game-organizer@example.com");
    } finally {
      await close();
    }
  });
});
