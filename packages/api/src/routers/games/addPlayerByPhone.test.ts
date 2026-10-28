import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GameFormatEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  gamePlayers,
  games,
  groupMembers,
  groups,
  matches,
  notifications,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import {
  NOW,
  asDb,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { createFriendlyGame } from "#src/games/create-friendly";
import { ORGANIZER_ADD_FORMAT_SOON_MESSAGE } from "#src/games/assert-organizer-add-format";
import { createBookingGame } from "#src/routers/bookings/createGame";
import { addPlayerByPhone } from "#src/routers/games/addPlayerByPhone";
import { gameById } from "#src/routers/games/byId";
import { previewPlayerByPhone } from "#src/routers/games/previewPlayerByPhone";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(
  database: TestDatabase,
  values: { name: string; phoneNumber?: string },
) {
  const [row] = await database
    .insert(user)
    .values({
      ...values,
      email: `${values.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function seed(
  database: TestDatabase,
  game: { levelMinTenths?: number } = {},
) {
  const organizer = await insertUser(database, { name: "Organizer" });
  const member = await insertUser(database, { name: "Member" });
  const ahmed = await insertUser(database, {
    name: "Ahmed Ali",
    phoneNumber: "+97336110001",
  });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Padel Central", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: "Thursday padel", createdBy: organizer })
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
    levelMinTenths: game.levelMinTenths ?? null,
  });
  return {
    organizer,
    member,
    ahmed,
    venueId: venue!.id,
    groupId: group!.id,
    gameId: created.game.id,
  };
}

function bahrain(nationalNumber: string) {
  return { countryIso: "BH", nationalNumber };
}

async function playersOn(database: TestDatabase, gameId: string) {
  return database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { userId: true },
  });
}

describe("games.previewPlayerByPhone and games.addPlayerByPhone", () => {
  it("adds a new number as one Unclaimed player with one Rating on the chosen Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await expect(
        previewPlayerByPhone(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          ...bahrain("3612 4408"),
        }),
      ).resolves.toEqual({ kind: "new", name: null, alreadyOnGame: false });

      const added = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        level: "C+",
        seat: { sideIndex: 2, position: "right" },
      });
      expect(added).toMatchObject({ kind: "new", name: "Ali" });

      const rows = await db.query.user.findMany({
        where: eq(user.phoneNumber, "+97336124408"),
      });
      expect(rows).toHaveLength(1);
      expect(isUnclaimed(rows[0]!)).toBe(true);
      expect(rows[0]).toMatchObject({
        id: added.userId,
        name: "Ali",
        addedByUserId: f.organizer,
      });
      const playerRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, added.userId),
      });
      expect(
        playerRatings.map((rating) => [rating.sport, rating.levelBand]),
      ).toEqual([["padel", "C1"]]);

      const details = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizer,
      });
      expect(details.sides[1]?.right).toMatchObject({
        userId: added.userId,
        name: "Ali",
        unclaimed: true,
        phoneMasked: "+973 •••• 4408",
      });
    } finally {
      await close();
    }
  });

  it("starts a new number with no Level picked at Not sure", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const added = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124409"),
        name: "Sara",
        seat: { sideIndex: 1, position: "left" },
      });
      const playerRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, added.userId),
      });
      expect(playerRatings.map((rating) => rating.levelBand)).toEqual(["D1"]);
    } finally {
      await close();
    }
  });

  it("reuses the Unclaimed player on a second Game and keeps the first name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const first = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        seat: { sideIndex: 1, position: "left" },
      });
      const windowStart = new Date(Date.now() + 48 * HOUR);
      const second = await createFriendlyGame(db, {
        createdBy: f.organizer,
        groupId: f.groupId,
        venueId: f.venueId,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
      });

      await expect(
        previewPlayerByPhone(db, {
          gameId: second.game.id,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
        }),
      ).resolves.toEqual({
        kind: "unclaimed",
        name: "Ali",
        alreadyOnGame: false,
        phoneMasked: "+973 •••• 4408",
      });
      const again = await addPlayerByPhone(db, {
        gameId: second.game.id,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali Hassan",
        level: "A",
        seat: { sideIndex: 1, position: "left" },
      });

      expect(again).toMatchObject({
        userId: first.userId,
        kind: "unclaimed",
        name: "Ali",
      });
      expect(
        await db.query.user.findMany({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toHaveLength(1);
      const playerRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, first.userId),
      });
      expect(playerRatings.map((rating) => rating.levelBand)).toEqual(["D1"]);
    } finally {
      await close();
    }
  });

  it("previews an account holder's name, seats them and sends them one Notification", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await expect(
        previewPlayerByPhone(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          ...bahrain("36110001"),
        }),
      ).resolves.toEqual({
        kind: "account",
        name: "Ahmed Ali",
        alreadyOnGame: false,
      });

      const added = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36110001"),
        name: "Ignored",
        level: "A",
        seat: { sideIndex: 1, position: "right" },
      });
      expect(added).toEqual({
        userId: f.ahmed,
        kind: "account",
        name: "Ahmed Ali",
      });
      expect(
        await db.query.ratings.findMany({ where: eq(ratings.userId, f.ahmed) }),
      ).toEqual([]);

      const received = await db.query.notifications.findMany({
        where: eq(notifications.recipientUserId, f.ahmed),
      });
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        type: "game_seated_by_organizer",
        audience: "player",
        actorUserId: f.organizer,
        gameId: f.gameId,
        groupId: f.groupId,
      });
      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.recipientUserId, f.organizer),
        }),
      ).toEqual([]);

      await expect(
        previewPlayerByPhone(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          ...bahrain("36110001"),
        }),
      ).resolves.toMatchObject({ kind: "account", alreadyOnGame: true });
    } finally {
      await close();
    }
  });

  it("tells the other Game admins about the join, not the adding Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, { name: "Owner" });
      const creator = await insertUser(db, { name: "Creator" });
      const [community] = await db
        .insert(communities)
        .values({ name: "Club", type: "public", createdBy: owner })
        .returning({ id: communities.id });
      await db.insert(communityMembers).values([
        {
          communityId: community!.id,
          userId: owner,
          role: CommunityRoleEnum.OWNER,
        },
        {
          communityId: community!.id,
          userId: creator,
          role: CommunityRoleEnum.MEMBER,
        },
      ]);
      const [group] = await db
        .insert(groups)
        .values({
          name: "Club padel",
          createdBy: creator,
          communityId: community!.id,
        })
        .returning({ id: groups.id });
      const [venue] = await db
        .insert(venues)
        .values({ name: "Club Courts", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const windowStart = new Date(Date.now() + 24 * HOUR);
      const { game } = await createFriendlyGame(db, {
        createdBy: creator,
        groupId: group!.id,
        venueId: venue!.id,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
      });

      const added = await addPlayerByPhone(db, {
        gameId: game.id,
        organizerUserId: owner,
        ...bahrain("36124408"),
        name: "Ali",
        seat: { sideIndex: 1, position: "left" },
      });

      const joined = await db.query.notifications.findMany({
        where: eq(notifications.type, "game_player_joined"),
      });
      expect(joined).toEqual([
        expect.objectContaining({
          recipientUserId: creator,
          audience: "admin",
          actorUserId: added.userId,
          gameId: game.id,
          viaWaitlist: false,
        }),
      ]);
    } finally {
      await close();
    }
  });

  it("seats a non-member on a Group Game without adding them to the Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36110001"),
        seat: { sideIndex: 1, position: "left" },
      });
      const unclaimed = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        seat: { sideIndex: 1, position: "right" },
      });

      expect(
        (await playersOn(db, f.gameId)).map((row) => row.userId).sort(),
      ).toEqual([f.ahmed, unclaimed.userId].sort());
      const members = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, f.groupId),
        columns: { userId: true },
      });
      expect(members.map((row) => row.userId).sort()).toEqual(
        [f.organizer, f.member].sort(),
      );
    } finally {
      await close();
    }
  });

  it("ignores the Level range and a closed registration", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db, { levelMinTenths: 50 });
      await db
        .update(games)
        .set({ registrationClosedAt: new Date() })
        .where(eq(games.id, f.gameId));

      await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        level: "D",
        seat: { sideIndex: 1, position: "left" },
      });
      await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36110001"),
        seat: { sideIndex: 1, position: "right" },
      });

      expect(await playersOn(db, f.gameId)).toHaveLength(2);
    } finally {
      await close();
    }
  });

  it("lets a Booking Game's holder add", async () => {
    await withBookableVenue(async (database, fixture) => {
      const booking = await insertBooking(database, fixture);
      const { gameId } = await createBookingGame(asDb(database), {
        bookingId: booking.id,
        userId: fixture.customer,
        now: NOW,
      });

      const added = await addPlayerByPhone(asDb(database), {
        gameId,
        organizerUserId: fixture.customer,
        ...bahrain("36124408"),
        name: "Ali",
        seat: { sideIndex: 2, position: "left" },
      });

      const seated = await database.query.gamePlayers.findFirst({
        where: and(
          eq(gamePlayers.gameId, gameId),
          eq(gamePlayers.userId, added.userId),
        ),
      });
      expect(seated).toBeDefined();
      await expect(
        addPlayerByPhone(asDb(database), {
          gameId,
          organizerUserId: fixture.other,
          ...bahrain("36124409"),
          name: "Sara",
          seat: { sideIndex: 2, position: "right" },
        }),
      ).rejects.toThrow("Only an organizer");
    });
  });

  it("never gives a Member the masked phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const added = await addPlayerByPhone(db, {
        gameId: f.gameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        seat: { sideIndex: 1, position: "left" },
      });

      const asMember = await gameById(db, {
        gameId: f.gameId,
        userId: f.member,
      });
      expect(asMember.sides[0]?.left).toMatchObject({
        userId: added.userId,
        unclaimed: true,
        phoneMasked: null,
      });
      expect(
        asMember.registeredPlayers.map((player) => player.phoneMasked),
      ).toEqual([null]);
      expect(
        asMember.gameTeams.flatMap((team) =>
          team.members.map((member) => member.phoneMasked),
        ),
      ).toEqual([null]);
      expect(JSON.stringify(asMember)).not.toContain("4408");

      const asOrganizer = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizer,
      });
      expect(asOrganizer.registeredPlayers).toEqual([
        expect.objectContaining({
          id: added.userId,
          unclaimed: true,
          phoneMasked: "+973 •••• 4408",
        }),
      ]);
    } finally {
      await close();
    }
  });

  describe("refuses", () => {
    it("a caller who is not an Organizer", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await expect(
          previewPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.member,
            ...bahrain("36124408"),
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.member,
            ...bahrain("36124408"),
            name: "Ali",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(
          await db.query.user.findFirst({
            where: eq(user.phoneNumber, "+97336124408"),
          }),
        ).toBeUndefined();
      } finally {
        await close();
      }
    });

    it("a full Game, and writes no Unclaimed player for it", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        const seats = [
          { sideIndex: 1, position: "left" },
          { sideIndex: 1, position: "right" },
          { sideIndex: 2, position: "left" },
          { sideIndex: 2, position: "right" },
        ] as const;
        for (const [index, seat] of seats.entries()) {
          await addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain(`3612440${index}`),
            name: `Player ${index}`,
            seat,
          });
        }

        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124409"),
            name: "Fifth",
            seat: { sideIndex: 2, position: "right" },
          }),
        ).rejects.toThrow("This Game is full");
        expect(
          await db.query.user.findFirst({
            where: eq(user.phoneNumber, "+97336124409"),
          }),
        ).toBeUndefined();
        expect(await db.query.gameWaitlist.findMany()).toEqual([]);
      } finally {
        await close();
      }
    });

    it("a cancelled Game", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await db
          .update(games)
          .set({ cancelledAt: new Date() })
          .where(eq(games.id, f.gameId));
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            name: "Ali",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow("This Game is cancelled");
      } finally {
        await close();
      }
    });

    it("a Game with a completed Match", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await db
          .update(matches)
          .set({ status: MatchStatusEnum.COMPLETED })
          .where(eq(matches.gameId, f.gameId));
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36110001"),
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow("This Game already has a completed Match");
        expect(await playersOn(db, f.gameId)).toEqual([]);
      } finally {
        await close();
      }
    });

    it("a person already on the Game", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await addPlayerByPhone(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
          name: "Ali",
          seat: { sideIndex: 1, position: "left" },
        });
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            seat: { sideIndex: 2, position: "left" },
          }),
        ).rejects.toThrow("Ali is already on this Game");
      } finally {
        await close();
      }
    });

    it("a taken Position", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await addPlayerByPhone(db, {
          gameId: f.gameId,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
          name: "Ali",
          seat: { sideIndex: 1, position: "left" },
        });
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124409"),
            name: "Sara",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow("That Position is occupied");
        expect(
          await db.query.user.findFirst({
            where: eq(user.phoneNumber, "+97336124409"),
          }),
        ).toBeUndefined();
      } finally {
        await close();
      }
    });

    it("a malformed number", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await expect(
          previewPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("3612"),
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "Enter the full phone number",
        });
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            countryIso: "ZZ",
            nationalNumber: "36124408",
            name: "Ali",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "Pick a supported country code",
        });
      } finally {
        await close();
      }
    });

    it("a new number without a name", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow("Enter their name");
      } finally {
        await close();
      }
    });

    it("formats other than a padel Friendly game", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        const [americano] = await db
          .insert(games)
          .values({
            format: GameFormatEnum.AMERICANO,
            groupId: f.groupId,
            venueId: f.venueId,
            createdBy: f.organizer,
            playersAllowed: 8,
          })
          .returning({ id: games.id });
        await expect(
          previewPlayerByPhone(db, {
            gameId: americano!.id,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
          }),
        ).rejects.toThrow(ORGANIZER_ADD_FORMAT_SOON_MESSAGE);
        await expect(
          addPlayerByPhone(db, {
            gameId: americano!.id,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            name: "Ali",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow(ORGANIZER_ADD_FORMAT_SOON_MESSAGE);
      } finally {
        await close();
      }
    });
  });
});
