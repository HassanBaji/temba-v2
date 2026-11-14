import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePlayers,
  groupMembers,
  groups,
  notifications,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { searchLookupUsers } from "#src/invites/search-lookup-users";
import { addGuestPlayer } from "#src/routers/games/addGuestPlayer";
import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { footballBoard } from "#src/routers/games/footballBoard";
import { kick } from "#src/routers/games/kick";
import { registerSeat } from "#src/routers/games/registerSeat";
import { renameUnclaimedPlayer } from "#src/routers/users/renameUnclaimedPlayer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  return row!.id;
}

async function seed(database: TestDatabase) {
  const organizer = await insertUser(database, "Organizer");
  const member = await insertUser(database, "Member");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Ace Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: "Tuesday Night Padel", createdBy: organizer })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values([
    { groupId: group!.id, userId: organizer },
    { groupId: group!.id, userId: member },
  ]);
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const created = await createFriendlyGame(database, {
    createdBy: organizer,
    groupId: group!.id,
    venueId: venue!.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
  });
  return {
    organizer,
    member,
    venueId: venue!.id,
    groupId: group!.id,
    gameId: created.game.id,
  };
}

describe("games.addGuestPlayer", () => {
  it("seats a name-only guest with no phone, Rating or Group membership", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const added = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        name: "  Fahad ",
        seat: { sideIndex: 2, position: "left" },
      });
      expect(added.name).toBe("Fahad");

      const row = await db.query.user.findFirst({
        where: eq(user.id, added.userId),
      });
      expect(row).toMatchObject({
        name: "Fahad",
        clerkId: null,
        phoneNumber: null,
        email: null,
        addedByUserId: f.organizer,
      });
      expect(row?.guestAt).toBeInstanceOf(Date);
      expect(
        await db.query.ratings.findMany({
          where: eq(ratings.userId, added.userId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.groupMembers.findMany({
          where: eq(groupMembers.userId, added.userId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.recipientUserId, added.userId),
        }),
      ).toHaveLength(0);

      const details = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizer,
      });
      const seat = details.sides.find((side) => side.sideIndex === 2)?.left;
      expect(seat).toMatchObject({
        userId: added.userId,
        guest: true,
        unclaimed: false,
        phoneMasked: null,
        canRename: true,
      });
    } finally {
      await close();
    }
  });

  it("shows a guest at the mean Level band of the other seated players", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await registerSeat(db, {
        gameId: f.gameId,
        userId: f.member,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId: f.gameId,
        userId: f.organizer,
        sideIndex: 1,
        position: "right",
      });
      await db.insert(ratings).values([
        {
          userId: f.organizer,
          sport: "padel",
          mu: 1500,
          phi: 100,
          sigma: 0.06,
          levelBand: "C3",
        },
        {
          userId: f.member,
          sport: "padel",
          mu: 1500,
          phi: 100,
          sigma: 0.06,
          levelBand: "C1",
        },
      ]);
      const added = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        name: "Fahad",
        seat: { sideIndex: 2, position: "left" },
      });

      const details = await gameById(db, {
        gameId: f.gameId,
        userId: f.member,
      });
      const seats = details.sides.flatMap((side) => [side.left, side.right]);
      expect(
        seats.find((seat) => seat?.userId === added.userId)?.levelBand,
      ).toBe("C2");
      expect(
        seats.find((seat) => seat?.userId === added.userId)?.canRename,
      ).toBe(false);
    } finally {
      await close();
    }
  });

  it("makes a new guest on every add, even with the same name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const first = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        name: "Fahad",
        seat: { sideIndex: 2, position: "left" },
      });
      const second = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        name: "Fahad",
        seat: { sideIndex: 2, position: "right" },
      });
      expect(second.userId).not.toBe(first.userId);
    } finally {
      await close();
    }
  });

  it("refuses anyone who does not organize the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await expect(
        addGuestPlayer(db, {
          gameId: f.gameId,
          organizerUserId: f.member,
          name: "Fahad",
          seat: { sideIndex: 2, position: "left" },
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(
        await db.query.gamePlayers.findMany({
          where: eq(gamePlayers.gameId, f.gameId),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("refuses a taken Position and an empty name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await registerSeat(db, {
        gameId: f.gameId,
        userId: f.member,
        sideIndex: 2,
        position: "left",
      });
      await expect(
        addGuestPlayer(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          name: "Fahad",
          seat: { sideIndex: 2, position: "left" },
        }),
      ).rejects.toBeDefined();
      await expect(
        addGuestPlayer(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          name: "   ",
          seat: { sideIndex: 2, position: "right" },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await db.query.user.findMany({ where: eq(user.name, "Fahad") }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("is renamed and removed through the doors an Unclaimed player uses, and never found by search", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const added = await addGuestPlayer(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        name: "Fahad",
        seat: { sideIndex: 2, position: "left" },
      });
      await renameUnclaimedPlayer(db, {
        callerUserId: f.organizer,
        userId: added.userId,
        name: "Fahad K",
      });
      expect(
        (await db.query.user.findFirst({ where: eq(user.id, added.userId) }))
          ?.name,
      ).toBe("Fahad K");

      const found = await searchLookupUsers(db, {
        query: "Fahad",
        excludeUserIds: [],
      });
      expect(found.map((row) => row.id)).not.toContain(added.userId);

      await kick(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        userId: added.userId,
      });
      expect(
        await db.query.gamePlayers.findMany({
          where: eq(gamePlayers.userId, added.userId),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("adds a football guest with a role, balanced at the roster's mean Level band", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const [pitch] = await db
        .insert(courts)
        .values({ venueId: f.venueId, name: "Pitch 1", sport: "football" })
        .returning({ id: courts.id });
      const [group] = await db
        .insert(groups)
        .values({
          name: "Karbabad Friday Football",
          createdBy: f.organizer,
          sport: "football",
        })
        .returning({ id: groups.id });
      await db
        .insert(groupMembers)
        .values({ groupId: group!.id, userId: f.organizer });
      const windowStart = new Date(Date.now() + 24 * HOUR);
      const created = await createGame(db, {
        createdBy: f.organizer,
        groupId: group!.id,
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        venueId: f.venueId,
        courtId: pitch!.id,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + HOUR),
      });
      await db.insert(ratings).values({
        userId: f.organizer,
        sport: "football",
        mu: 1500,
        phi: 100,
        sigma: 0.06,
        levelBand: "B3",
      });
      await db
        .insert(gamePlayers)
        .values({ gameId: created.id, userId: f.organizer });

      const added = await addGuestPlayer(db, {
        gameId: created.id,
        organizerUserId: f.organizer,
        name: "Abu Fahad",
        football: { role: "outfield", position: "mid" },
      });
      await expect(
        addGuestPlayer(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          name: "Abu Fahad",
          football: { role: "keeper", position: null },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const board = await footballBoard(db, {
        gameId: created.id,
        userId: f.organizer,
      });
      expect(
        board.players.find((player) => player.userId === added.userId),
      ).toMatchObject({
        guest: true,
        unclaimed: false,
        role: "outfield",
        position: "mid",
        levelBand: "B3",
      });
    } finally {
      await close();
    }
  });
});
