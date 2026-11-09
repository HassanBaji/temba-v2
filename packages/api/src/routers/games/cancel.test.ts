import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, matches, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { createFriendlyGame } from "#src/games/create-friendly";
import { cancelGame } from "#src/routers/games/cancel";
import { cancelMatch } from "#src/routers/games/cancelMatch";

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
  return { owner, game: created.game, matchId: created.matchId };
}

async function gameAndMatch(database: TestDatabase, gameId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.id, gameId),
  });
  const match = await database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
  });
  return { cancelledAt: game?.cancelledAt ?? null, status: match?.status };
}

describe("cancelGame", () => {
  it("cancels a Friendly game before its result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, game } = await friendlyGame(db);
      await cancelGame(db, { gameId: game.id, userId: owner.id });
      const after = await gameAndMatch(db, game.id);
      expect(after.cancelledAt).not.toBeNull();
      expect(after.status).toBe("cancelled");
    } finally {
      await close();
    }
  });

  it("refuses once the Match is completed, through cancel and cancelMatch", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, game, matchId } = await friendlyGame(db);
      await db
        .update(matches)
        .set({ status: "completed" })
        .where(eq(matches.gameId, game.id));
      const message = messagesFor("en").game.errors.cancelPlayed;

      await expect(
        cancelGame(db, { gameId: game.id, userId: owner.id }),
      ).rejects.toThrow(message);
      await expect(
        cancelMatch(db, { gameId: game.id, userId: owner.id, matchId }),
      ).rejects.toThrow(message);

      expect(await gameAndMatch(db, game.id)).toEqual({
        cancelledAt: null,
        status: "completed",
      });
    } finally {
      await close();
    }
  });
});
