import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import { gameById } from "#src/routers/games/byId";
import { GAME_PLAYED_LEAVE_MESSAGE, leaveGame } from "#src/routers/games/leave";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { createFriendlyGame } from "#src/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertPublicFriendly(
  database: TestDatabase,
  args: { createdBy: string; venueId: string },
) {
  const group = await insertGroup(database, args.createdBy);
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    groupId: group.id,
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

  it("refuses once the Game has been played; the roster is the record", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "caller@example.com", "Ada");
      const venue = await insertVenue(db);
      const game = await insertPublicFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: caller.id,
        sideIndex: 1,
        position: "left",
      });
      const afterTheGame = new Date(
        (game.windowEnd?.getTime() ?? Date.now()) + 60 * 60 * 1000,
      );

      await expect(
        leaveGame(db, {
          gameId: game.id,
          userId: caller.id,
          now: afterTheGame,
        }),
      ).rejects.toThrow(GAME_PLAYED_LEAVE_MESSAGE);

      const players = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(players.map((row) => row.userId)).toEqual([caller.id]);
    } finally {
      await close();
    }
  });

  it("refuses once the Match is completed, even inside the window, and nobody takes the freed seat", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db);
      const players = [
        await insertUser(db, "a@example.com", "A"),
        await insertUser(db, "b@example.com", "B"),
        await insertUser(db, "c@example.com", "C"),
        await insertUser(db, "d@example.com", "D"),
      ];
      const game = await insertPublicFriendly(db, {
        createdBy: players[0]!.id,
        venueId: venue.id,
      });
      const seats = [
        [1, "left"],
        [1, "right"],
        [2, "left"],
        [2, "right"],
      ] as const;
      for (const [index, [sideIndex, position]] of seats.entries()) {
        await registerSeat(db, {
          gameId: game.id,
          userId: players[index]!.id,
          sideIndex,
          position,
        });
      }
      await db
        .update(matches)
        .set({ status: "completed" })
        .where(eq(matches.gameId, game.id));

      await expect(
        leaveGame(db, { gameId: game.id, userId: players[3]!.id }),
      ).rejects.toThrow(GAME_PLAYED_LEAVE_MESSAGE);

      const stranger = await insertUser(db, "e@example.com", "E");
      await expect(
        registerSeat(db, { gameId: game.id, userId: stranger.id }),
      ).rejects.toThrow(messagesFor("en").game.errors.played);

      const roster = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(roster.map((row) => row.userId).sort()).toEqual(
        players.map((row) => row.id).sort(),
      );
      const waitlist = await db.query.gameWaitlist.findMany({
        where: (table, { eq: equals }) => equals(table.gameId, game.id),
      });
      expect(waitlist).toEqual([]);
    } finally {
      await close();
    }
  });
});
