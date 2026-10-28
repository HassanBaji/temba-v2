import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  courts,
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
import { balanceFootballSides } from "@repo/domain/football-lineup";
import { PARTNER_REQUIRED_REFUSAL_MESSAGE } from "@repo/domain/tournament-rounds";
import { createFriendlyGame } from "#src/games/create-friendly";
import { ORGANIZER_ADD_TEAM_ONLY_MESSAGE } from "#src/games/assert-organizer-add-format";
import { POOL_DRAW_POSTED_MESSAGE } from "#src/games/assert-pool-draw-not-posted";
import { createBookingGame } from "#src/routers/bookings/createGame";
import { addPlayerByPhone } from "#src/routers/games/addPlayerByPhone";
import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { footballBoard } from "#src/routers/games/footballBoard";
import { previewPlayerByPhone } from "#src/routers/games/previewPlayerByPhone";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { registerSeat } from "#src/routers/games/registerSeat";
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

    it("a team-only Game", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        const [teamOnly] = await db
          .insert(games)
          .values({
            format: GameFormatEnum.FRIENDLY_TOURNAMENT,
            registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
            groupId: f.groupId,
            venueId: f.venueId,
            createdBy: f.organizer,
            teamsAllowed: 4,
          })
          .returning({ id: games.id });
        await expect(
          previewPlayerByPhone(db, {
            gameId: teamOnly!.id,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
          }),
        ).rejects.toThrow(ORGANIZER_ADD_TEAM_ONLY_MESSAGE);
        await expect(
          addPlayerByPhone(db, {
            gameId: teamOnly!.id,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            name: "Ali",
            side: { sideIndex: 1 },
          }),
        ).rejects.toThrow(ORGANIZER_ADD_TEAM_ONLY_MESSAGE);
      } finally {
        await close();
      }
    });

    it("a football role or Level on a padel Friendly game", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const f = await seed(db);
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            name: "Ali",
            seat: { sideIndex: 1, position: "left" },
            football: { role: "outfield", position: null },
          }),
        ).rejects.toThrow("Only a football Game takes a role and position");
        await expect(
          addPlayerByPhone(db, {
            gameId: f.gameId,
            organizerUserId: f.organizer,
            ...bahrain("36124408"),
            name: "Ali",
            level: "pro",
            seat: { sideIndex: 1, position: "left" },
          }),
        ).rejects.toThrow("Pick a padel Level");
      } finally {
        await close();
      }
    });
  });
});

async function seedTournament(
  database: TestDatabase,
  args: { allowSoloRegister?: boolean } = {},
) {
  const f = await seed(database);
  const windowStart = new Date(Date.now() + 14 * 24 * HOUR);
  const created = await createTournament(database, {
    createdBy: f.organizer,
    name: "Autumn Friendly",
    groupId: f.groupId,
    isPublic: false,
    allowSoloRegister: args.allowSoloRegister,
    teamCount: 4,
    poolCount: 1,
    venueId: f.venueId,
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 4 * HOUR),
  });
  return { ...f, tournamentId: created.id };
}

async function seedFootball(database: TestDatabase) {
  const f = await seed(database);
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: f.venueId, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Friday Football",
      createdBy: f.organizer,
      sport: "football",
    })
    .returning({ id: groups.id });
  await database
    .insert(groupMembers)
    .values({ groupId: group!.id, userId: f.organizer });
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const created = await createGame(database, {
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
  return { ...f, footballGameId: created.id };
}

describe("games.addPlayerByPhone on an Americano", () => {
  it("registers onto the roster with no Position and counts against players allowed", async () => {
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
          playersAllowed: 4,
        })
        .returning({ id: games.id });
      const gameId = americano!.id;

      await expect(
        previewPlayerByPhone(db, {
          gameId,
          organizerUserId: f.organizer,
          ...bahrain("36110001"),
        }),
      ).resolves.toMatchObject({ kind: "account", alreadyOnGame: false });

      const added = [];
      for (const [index, phone] of [
        "36124401",
        "36124402",
        "36124403",
        "36110001",
      ].entries()) {
        added.push(
          await addPlayerByPhone(db, {
            gameId,
            organizerUserId: f.organizer,
            ...bahrain(phone),
            name: `Player ${index}`,
            level: "B",
          }),
        );
      }
      expect(added.map((row) => row.kind)).toEqual([
        "new",
        "new",
        "new",
        "account",
      ]);

      expect(await playersOn(db, gameId)).toHaveLength(4);
      expect(
        await db.query.gameTeamPlayers.findMany({ columns: { id: true } }),
      ).toEqual([]);

      await expect(
        addPlayerByPhone(db, {
          gameId,
          organizerUserId: f.organizer,
          ...bahrain("36124405"),
          name: "Fifth",
        }),
      ).rejects.toThrow("This Game is full");

      const details = await gameById(db, { gameId, userId: f.organizer });
      expect(details.roster).toMatchObject({ count: 4, cap: 4 });
      expect(
        details.registeredPlayers.find((row) => row.id === added[0]!.userId),
      ).toMatchObject({ unclaimed: true, phoneMasked: "+973 •••• 4401" });
    } finally {
      await close();
    }
  });

  it("refuses once a Match is completed", async () => {
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
      await db.insert(matches).values({
        gameId: americano!.id,
        status: MatchStatusEnum.COMPLETED,
      });
      await expect(
        addPlayerByPhone(db, {
          gameId: americano!.id,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
          name: "Ali",
        }),
      ).rejects.toThrow("This Game already has a completed Match");
    } finally {
      await close();
    }
  });
});

describe("games.addPlayerByPhone on a Friendly tournament", () => {
  it("seats a Half team on a vacant side, then fills its open Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedTournament(db);
      const first = await addPlayerByPhone(db, {
        gameId: f.tournamentId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        side: { sideIndex: 2 },
      });
      let details = await gameById(db, {
        gameId: f.tournamentId,
        userId: f.organizer,
      });
      expect(details.sides[1]?.left).toMatchObject({
        userId: first.userId,
        unclaimed: true,
      });
      expect(details.sides[1]?.right).toBeNull();

      const second = await addPlayerByPhone(db, {
        gameId: f.tournamentId,
        organizerUserId: f.organizer,
        ...bahrain("36110001"),
        side: { sideIndex: 2 },
      });
      expect(second.kind).toBe("account");
      details = await gameById(db, {
        gameId: f.tournamentId,
        userId: f.organizer,
      });
      expect(details.sides[1]?.left?.userId).toBe(first.userId);
      expect(details.sides[1]?.right?.userId).toBe(f.ahmed);

      await expect(
        addPlayerByPhone(db, {
          gameId: f.tournamentId,
          organizerUserId: f.organizer,
          ...bahrain("36124409"),
          name: "Sara",
          side: { sideIndex: 2 },
        }),
      ).rejects.toThrow("That side is full");
      await expect(
        addPlayerByPhone(db, {
          gameId: f.tournamentId,
          organizerUserId: f.organizer,
          ...bahrain("36124409"),
          name: "Sara",
        }),
      ).rejects.toThrow("Pick a side");
    } finally {
      await close();
    }
  });

  it("fills a Half team a player left by registering alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedTournament(db);
      await registerSeat(db, {
        gameId: f.tournamentId,
        userId: f.member,
        sideIndex: 1,
        position: "right",
      });
      const added = await addPlayerByPhone(db, {
        gameId: f.tournamentId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        side: { sideIndex: 1 },
      });
      const details = await gameById(db, {
        gameId: f.tournamentId,
        userId: f.organizer,
      });
      expect(details.sides[0]?.left?.userId).toBe(added.userId);
      expect(details.sides[0]?.right?.userId).toBe(f.member);
    } finally {
      await close();
    }
  });

  it("on a tournament that does not allow registering alone, keeps the side a Half team until the second add", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedTournament(db, { allowSoloRegister: false });
      const first = await addPlayerByPhone(db, {
        gameId: f.tournamentId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        side: { sideIndex: 1 },
      });
      await expect(
        registerSeat(db, {
          gameId: f.tournamentId,
          userId: f.member,
          sideIndex: 1,
          position: "right",
        }),
      ).rejects.toThrow(PARTNER_REQUIRED_REFUSAL_MESSAGE);
      let details = await gameById(db, {
        gameId: f.tournamentId,
        userId: f.organizer,
      });
      expect(details.sides[0]?.left?.userId).toBe(first.userId);
      expect(details.sides[0]?.right).toBeNull();

      const second = await addPlayerByPhone(db, {
        gameId: f.tournamentId,
        organizerUserId: f.organizer,
        ...bahrain("36124409"),
        name: "Sara",
        side: { sideIndex: 1 },
      });
      details = await gameById(db, {
        gameId: f.tournamentId,
        userId: f.organizer,
      });
      expect(details.sides[0]?.right?.userId).toBe(second.userId);
    } finally {
      await close();
    }
  });

  it("refuses once the Pool draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedTournament(db);
      await db
        .update(games)
        .set({ drawPostedAt: new Date() })
        .where(eq(games.id, f.tournamentId));
      await expect(
        previewPlayerByPhone(db, {
          gameId: f.tournamentId,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
        }),
      ).rejects.toThrow(POOL_DRAW_POSTED_MESSAGE);
      await expect(
        addPlayerByPhone(db, {
          gameId: f.tournamentId,
          organizerUserId: f.organizer,
          ...bahrain("36124408"),
          name: "Ali",
          side: { sideIndex: 1 },
        }),
      ).rejects.toThrow(POOL_DRAW_POSTED_MESSAGE);
      expect(
        await db.query.user.findFirst({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });
});

describe("games.addPlayerByPhone on a football Game", () => {
  it("stores the role and position, and rates a new number from the self-placement", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedFootball(db);
      const keeper = await addPlayerByPhone(db, {
        gameId: f.footballGameId,
        organizerUserId: f.organizer,
        ...bahrain("36124408"),
        name: "Ali",
        level: "pro",
        football: { role: "keeper", position: null },
      });
      const outfield = await addPlayerByPhone(db, {
        gameId: f.footballGameId,
        organizerUserId: f.organizer,
        ...bahrain("36124409"),
        name: "Sara",
        football: { role: "outfield", position: "fwd" },
      });
      const fallback = await addPlayerByPhone(db, {
        gameId: f.footballGameId,
        organizerUserId: f.organizer,
        ...bahrain("36124410"),
        name: "Noor",
      });

      const rows = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, f.footballGameId),
        columns: { userId: true, footballRole: true, footballPosition: true },
      });
      const byUser = new Map(rows.map((row) => [row.userId, row]));
      expect(byUser.get(keeper.userId)).toMatchObject({
        footballRole: "keeper",
        footballPosition: null,
      });
      expect(byUser.get(outfield.userId)).toMatchObject({
        footballRole: "outfield",
        footballPosition: "fwd",
      });
      expect(byUser.get(fallback.userId)).toMatchObject({
        footballRole: "outfield",
        footballPosition: null,
      });

      const footballRatings = await db.query.ratings.findMany({
        where: eq(ratings.sport, "football"),
        columns: { userId: true, levelBand: true },
      });
      const bandByUser = new Map(
        footballRatings.map((row) => [row.userId, row.levelBand]),
      );
      expect(bandByUser.get(keeper.userId)).toBe("B3");
      expect(bandByUser.get(outfield.userId)).toBe("D3");
      expect(bandByUser.get(fallback.userId)).toBe("D3");
      expect(
        await db.query.ratings.findMany({
          where: and(
            eq(ratings.userId, keeper.userId),
            eq(ratings.sport, "padel"),
          ),
        }),
      ).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses a padel Level, a third keeper and a full roster", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedFootball(db);
      await expect(
        addPlayerByPhone(db, {
          gameId: f.footballGameId,
          organizerUserId: f.organizer,
          ...bahrain("36124400"),
          name: "Ali",
          level: "C+",
        }),
      ).rejects.toThrow("Pick a football Level");
      for (const phone of ["36124401", "36124402"]) {
        await addPlayerByPhone(db, {
          gameId: f.footballGameId,
          organizerUserId: f.organizer,
          ...bahrain(phone),
          name: `Keeper ${phone}`,
          football: { role: "keeper", position: null },
        });
      }
      await expect(
        addPlayerByPhone(db, {
          gameId: f.footballGameId,
          organizerUserId: f.organizer,
          ...bahrain("36124403"),
          name: "Third keeper",
          football: { role: "keeper", position: null },
        }),
      ).rejects.toThrow("Both keeper seats are taken");

      const game = await db.query.games.findFirst({
        where: eq(games.id, f.footballGameId),
        columns: { playersAllowed: true },
      });
      for (let index = 2; index < game!.playersAllowed!; index += 1) {
        await addPlayerByPhone(db, {
          gameId: f.footballGameId,
          organizerUserId: f.organizer,
          ...bahrain(`3612450${index}`),
          name: `Player ${index}`,
        });
      }
      await expect(
        addPlayerByPhone(db, {
          gameId: f.footballGameId,
          organizerUserId: f.organizer,
          ...bahrain("36124499"),
          name: "One too many",
        }),
      ).rejects.toThrow("This Game is full");
    } finally {
      await close();
    }
  });

  it("puts an added player into Make teams by Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedFootball(db);
      const added = [];
      for (const [index, level] of (
        ["pro", "beginner", "competitive", "casual"] as const
      ).entries()) {
        added.push(
          await addPlayerByPhone(db, {
            gameId: f.footballGameId,
            organizerUserId: f.organizer,
            ...bahrain(`3612440${index}`),
            name: `Player ${index}`,
            level,
          }),
        );
      }

      const board = await footballBoard(db, {
        gameId: f.footballGameId,
        userId: f.organizer,
      });
      expect(
        board.players.map((player) => [player.userId, player.levelBand]),
      ).toEqual([
        [added[0]!.userId, "B3"],
        [added[1]!.userId, "D3"],
        [added[2]!.userId, "C1"],
        [added[3]!.userId, "C3"],
      ]);
      expect(board.viewer.canMakeTeams).toBe(true);

      const split = balanceFootballSides(board.players);
      expect([...split.slot1, ...split.slot2].sort()).toEqual(
        added.map((row) => row.userId).sort(),
      );
      await publishFootballTeams(db, {
        gameId: f.footballGameId,
        userId: f.organizer,
        method: "level",
        bibs: { slot1: "black", slot2: "white" },
        ...split,
      });
      const published = await footballBoard(db, {
        gameId: f.footballGameId,
        userId: f.organizer,
      });
      expect(
        published.players.every((player) => player.sideIndex != null),
      ).toBe(true);
    } finally {
      await close();
    }
  });
});
