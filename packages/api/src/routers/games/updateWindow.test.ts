import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, matches, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { createFriendlyGame } from "#src/games/create-friendly";
import { updateGameWindow } from "#src/routers/games/updateWindow";

async function friendlyGame(database: TestDatabase) {
  const [owner] = await database
    .insert(user)
    .values({ name: "Owner", email: "owner@example.com" })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Venue", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  if (!owner || !venue) {
    throw new Error("Failed to insert owner or Venue");
  }
  const [group] = await database
    .insert(groups)
    .values({ name: "Group", createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert Group");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy: owner.id,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  return { owner, game: created.game };
}

function nextWeek() {
  const windowStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
    name: "Next week",
  };
}

describe("updateGameWindow", () => {
  it("moves the window of a Game that has not been played", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, game } = await friendlyGame(db);
      const next = nextWeek();
      await updateGameWindow(db, {
        gameId: game.id,
        userId: owner.id,
        ...next,
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, game.id),
      });
      expect(row?.windowStart?.getTime()).toBe(next.windowStart.getTime());
    } finally {
      await close();
    }
  });

  it("refuses once the Match is completed or the window has ended", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, game } = await friendlyGame(db);
      const played = messagesFor("en").game.errors.played;
      const afterTheGame = new Date(
        (game.windowEnd?.getTime() ?? Date.now()) + 60 * 60 * 1000,
      );
      await expect(
        updateGameWindow(db, {
          gameId: game.id,
          userId: owner.id,
          now: afterTheGame,
          ...nextWeek(),
        }),
      ).rejects.toThrow(played);

      await db
        .update(matches)
        .set({ status: "completed" })
        .where(eq(matches.gameId, game.id));
      await expect(
        updateGameWindow(db, {
          gameId: game.id,
          userId: owner.id,
          ...nextWeek(),
        }),
      ).rejects.toThrow(played);

      const row = await db.query.games.findFirst({
        where: eq(games.id, game.id),
      });
      expect(row?.windowStart?.getTime()).toBe(game.windowStart?.getTime());
    } finally {
      await close();
    }
  });
});
