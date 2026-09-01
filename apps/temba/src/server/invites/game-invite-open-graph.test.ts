import { games, GameFormatEnum, matches, user, venues } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GENERIC_TEMBA_OPEN_GRAPH } from "~/lib/game-invite-open-graph";
import { mintLink } from "~/server/invites/doors";
import { loadGameInviteOpenGraph } from "~/server/invites/game-invite-open-graph";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
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
    .values({
      name: venueName,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue.id,
      createdBy,
      playersAllowed: 4,
      windowStart,
      windowEnd,
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: game.id });
  return game;
}

describe("loadGameInviteOpenGraph", () => {
  it("returns Venue occupancy metadata for a live Friendly game and generic Temba for dead codes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "og-owner@example.com");
      const game = await insertFriendlyGame(db, owner.id, "Ocean Padel");
      const minted = await mintLink(
        db,
        { kind: "game", id: game.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      const live = await loadGameInviteOpenGraph(db, minted.link.shortCode!);
      expect(live.title).toBe("Ocean Padel");
      expect(live.description).toContain("0/4 sitting");
      expect(live.description).not.toMatch(/Test User|og-owner/);

      expect(await loadGameInviteOpenGraph(db, "0O1ILUAB")).toEqual(
        GENERIC_TEMBA_OPEN_GRAPH,
      );
      expect(await loadGameInviteOpenGraph(db, "ZZZZZZZZ")).toEqual(
        GENERIC_TEMBA_OPEN_GRAPH,
      );

      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, game.id));
      expect(await loadGameInviteOpenGraph(db, minted.link.shortCode!)).toEqual(
        GENERIC_TEMBA_OPEN_GRAPH,
      );
    } finally {
      await close();
    }
  });
});
