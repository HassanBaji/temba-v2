import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { leaveGame } from "~/server/api/routers/games/leave";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertPublicFriendly(
  database: TestDatabase,
  args: { createdBy: string; venueId: string },
) {
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    venueId: args.venueId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  const [row] = await database
    .update(games)
    .set({ isPublic: true })
    .where(eq(games.id, created.game.id))
    .returning();
  if (!row) {
    throw new Error("Failed to mark Game public");
  }
  return row;
}

describe("leaveGame", () => {
  it("frees only the leaver's Position after partner registration; the Game team stays incomplete", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "caller@example.com", "Ada");
      const partner = await insertUser(db, "partner@example.com", "Sofia L");
      const venue = await insertVenue(db);
      const game = await insertPublicFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
      });

      await registerWithPartner(db, {
        gameId: game.id,
        userId: caller.id,
        partnerUserId: partner.id,
        sideIndex: 1,
        position: "left",
      });

      const seated = await gameById(db, {
        gameId: game.id,
        userId: caller.id,
      });
      expect(seated.isSeated).toBe(true);
      const bookedSide = seated.sides.find(
        (side) =>
          side.left?.userId === caller.id && side.right?.userId === partner.id,
      );
      expect(bookedSide?.gameTeamId).toBeTruthy();
      const teamId = bookedSide?.gameTeamId;
      if (!teamId) {
        throw new Error("expected a Game team after partner registration");
      }

      await leaveGame(db, { gameId: game.id, userId: caller.id });

      const remainingLinks = await db.query.gameTeamPlayers.findMany({
        where: eq(gameTeamPlayers.gameTeamId, teamId),
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0]?.position).toBe("right");

      const team = await db.query.gameTeams.findFirst({
        where: eq(gameTeams.id, teamId),
      });
      expect(team).toBeTruthy();

      const players = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(players.map((row) => row.userId)).toEqual([partner.id]);

      const partnerView = await gameById(db, {
        gameId: game.id,
        userId: partner.id,
      });
      expect(partnerView.isSeated).toBe(true);
      expect(partnerView.isRegistered).toBe(true);
      const leftover = partnerView.sides.find(
        (side) => side.gameTeamId === teamId,
      );
      expect(leftover?.left).toBeNull();
      expect(leftover?.right?.userId).toBe(partner.id);

      const callerView = await gameById(db, {
        gameId: game.id,
        userId: caller.id,
      });
      expect(callerView.isSeated).toBe(false);
      expect(callerView.isRegistered).toBe(false);
    } finally {
      await close();
    }
  });
});
