import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gameCourts,
  gamePlayers,
  gameTeams,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  notifications,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { createTournament } from "#src/routers/games/createTournament";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { updateGameCaps } from "#src/routers/games/updateCaps";
import { updateGameCourts } from "#src/routers/games/updateCourts";

const errors = messagesFor("en").game.errors;

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

async function insertMember(
  database: TestDatabase,
  groupId: string,
  name: string,
) {
  const member = await insertUser(database, name);
  await database.insert(groupMembers).values({ groupId, userId: member.id });
  return member;
}

async function insertCourt(database: TestDatabase, venueId: string) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name: `Court ${crypto.randomUUID().slice(0, 4)}` })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert Court");
  }
  return row.id;
}

async function setUp(
  database: TestDatabase,
  options: { allowSoloRegister?: boolean } = {},
) {
  const owner = await insertUser(database, "Owner");
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert Venue or Group");
  }
  const firstCourt = await insertCourt(database, venue.id);
  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { id: gameId } = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Cup",
    groupId: group.id,
    isPublic: false,
    allowSoloRegister: options.allowSoloRegister ?? true,
    teamCount: 8,
    poolCount: 2,
    venueId: venue.id,
    courtIds: [firstCourt],
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 4 * 60 * 60 * 1000),
  });
  return { owner, groupId: group.id, venueId: venue.id, firstCourt, gameId };
}

/** Seats a full Game team on each side in turn, the first side joining first. */
async function seatFullTeams(
  database: TestDatabase,
  { gameId, groupId }: { gameId: string; groupId: string },
  sides: number,
) {
  const bySide = new Map<number, string[]>();
  for (let sideIndex = 1; sideIndex <= sides; sideIndex += 1) {
    const left = await insertMember(database, groupId, `Left${sideIndex}`);
    const right = await insertMember(database, groupId, `Right${sideIndex}`);
    await registerSeat(database, {
      gameId,
      userId: left.id,
      sideIndex,
      position: "left",
    });
    await registerSeat(database, {
      gameId,
      userId: right.id,
      sideIndex,
      position: "right",
    });
    bySide.set(sideIndex, [left.id, right.id]);
  }
  return bySide;
}

async function setJoinedAt(
  database: TestDatabase,
  gameId: string,
  userIds: readonly string[],
  joinedAt: Date,
) {
  for (const userId of userIds) {
    await database
      .update(gamePlayers)
      .set({ createdAt: joinedAt })
      .where(
        and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
      );
  }
}

describe("updateGameCaps on a Friendly tournament", () => {
  it("moves the latest team to the Waitlist, tells its players and refills the sides", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const setup = await setUp(db);
      const { owner, gameId } = setup;
      const bySide = await seatFullTeams(db, setup, 7);
      for (const [sideIndex, userIds] of bySide) {
        await setJoinedAt(
          db,
          gameId,
          userIds,
          new Date(Date.UTC(2026, 10, 1, 10, sideIndex)),
        );
      }
      const latest = bySide.get(2)!;
      const latestJoinedAt = new Date(Date.UTC(2026, 10, 1, 11, 0));
      await setJoinedAt(db, gameId, latest, latestJoinedAt);

      const result = await updateGameCaps(db, {
        gameId,
        userId: owner.id,
        teamsAllowed: 6,
      });

      expect([...result.movedToWaitlist].sort()).toEqual([...latest].sort());
      const waitlist = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, gameId),
      });
      expect(waitlist.map((row) => row.userId).sort()).toEqual(
        [...latest].sort(),
      );
      expect(
        waitlist.every(
          (row) => row.createdAt.getTime() === latestJoinedAt.getTime(),
        ),
      ).toBe(true);

      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game).toMatchObject({ teamsAllowed: 6, playersAllowed: 12 });

      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
        with: { players: { with: { gamePlayer: true } } },
      });
      expect(teams.map((team) => team.sideIndex).sort()).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
      const sideTwo = teams.find((team) => team.sideIndex === 2);
      expect(
        sideTwo?.players.map((link) => link.gamePlayer?.userId).sort(),
      ).toEqual([...bySide.get(7)!].sort());

      const sent = await db.query.notifications.findMany({
        where: eq(notifications.type, "game_moved_to_waitlist"),
      });
      expect(sent.map((row) => row.recipientUserId).sort()).toEqual(
        [...latest].sort(),
      );
    } finally {
      await close();
    }
  });

  it("brings waitlisted players back when the teams go up again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const setup = await setUp(db);
      const { owner, gameId } = setup;
      await seatFullTeams(db, setup, 7);
      const moved = await updateGameCaps(db, {
        gameId,
        userId: owner.id,
        teamsAllowed: 6,
      });
      expect(moved.movedToWaitlist).toHaveLength(2);

      await updateGameCaps(db, { gameId, userId: owner.id, teamsAllowed: 8 });

      expect(
        await db.query.gameWaitlist.findMany({
          where: eq(gameWaitlist.gameId, gameId),
        }),
      ).toEqual([]);
      const seated = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, gameId),
      });
      expect(seated).toHaveLength(14);
    } finally {
      await close();
    }
  });

  it("refuses a count the format cannot take", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await setUp(db);
      await expect(
        updateGameCaps(db, { gameId, userId: owner.id, teamsAllowed: 4 }),
      ).rejects.toThrow(errors.teamsNotForShape(4));
    } finally {
      await close();
    }
  });

  it("refuses once the draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await setUp(db);
      await db
        .update(games)
        .set({ drawPostedAt: new Date() })
        .where(eq(games.id, gameId));
      await expect(
        updateGameCaps(db, { gameId, userId: owner.id, teamsAllowed: 10 }),
      ).rejects.toThrow(errors.teamsAfterDraw);
    } finally {
      await close();
    }
  });

  it("keeps every pair on a pairs-only tournament, which has no Waitlist", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, groupId, gameId } = await setUp(db, {
        allowSoloRegister: false,
      });
      for (let index = 0; index < 7; index += 1) {
        const player = await insertMember(db, groupId, `Player${index}`);
        const partner = await insertMember(db, groupId, `Partner${index}`);
        await registerWithPartner(db, {
          gameId,
          userId: player.id,
          partnerUserId: partner.id,
          sideIndex: index + 1,
          position: "left",
        });
      }
      await expect(
        updateGameCaps(db, { gameId, userId: owner.id, teamsAllowed: 6 }),
      ).rejects.toThrow(errors.teamsBelowJoinedPairsOnly(7));
      await expect(
        updateGameCaps(db, { gameId, userId: owner.id, teamsAllowed: 10 }),
      ).resolves.toEqual({ ok: true, movedToWaitlist: [] });
    } finally {
      await close();
    }
  });
});

describe("updateGameCourts", () => {
  it("replaces the recorded Courts with Courts of the Game's Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, venueId, gameId } = await setUp(db);
      const second = await insertCourt(db, venueId);
      const third = await insertCourt(db, venueId);

      await updateGameCourts(db, {
        gameId,
        userId: owner.id,
        courtIds: [second, third],
      });

      const recorded = await db.query.gameCourts.findMany({
        where: eq(gameCourts.gameId, gameId),
      });
      expect(recorded.map((row) => row.courtId).sort()).toEqual(
        [second, third].sort(),
      );
    } finally {
      await close();
    }
  });

  it("refuses a Court of another Venue and an empty list", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await setUp(db);
      const [elsewhere] = await db
        .insert(venues)
        .values({ name: "Elsewhere", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const foreignCourt = await insertCourt(db, elsewhere!.id);

      await expect(
        updateGameCourts(db, {
          gameId,
          userId: owner.id,
          courtIds: [foreignCourt],
        }),
      ).rejects.toThrow(errors.courtNotGameVenue);
      await expect(
        updateGameCourts(db, { gameId, userId: owner.id, courtIds: [] }),
      ).rejects.toThrow(errors.courtsAtLeastOne);
    } finally {
      await close();
    }
  });
});
