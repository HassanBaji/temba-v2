import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  gameLevelRangeRequests,
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  GroupTypeEnum,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { listWaitingRequests } from "#src/routers/notifications/waitingRequests";

const HOUR = 60 * 60 * 1000;

async function withDatabase(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}
const NOW = new Date("2026-11-11T09:00:00.000Z");

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.replace(/\s+/g, ".")}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertGroup(
  database: TestDatabase,
  args: { name: string; createdBy: string; sport?: "padel" | "football" },
) {
  const [group] = await database
    .insert(groups)
    .values({
      name: args.name,
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      sport: args.sport ?? "padel",
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: args.createdBy });
  return group.id;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    groupId: string | null;
    windowStart: Date;
    cancelled?: boolean;
  },
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue?.id ?? null,
      createdBy: args.createdBy,
      groupId: args.groupId,
      playersAllowed: 4,
      levelMinTenths: 28,
      levelMaxTenths: 41,
      windowStart: args.windowStart,
      windowEnd: new Date(args.windowStart.getTime() + 2 * HOUR),
      cancelledAt: args.cancelled ? NOW : null,
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: game.id });
  return game;
}

describe("listWaitingRequests", () => {
  it("is empty for someone who organizes nothing", () =>
    withDatabase(async (database) => {
      const owner = await insertUser(database, "Owner");
      const stranger = await insertUser(database, "Stranger");
      const requester = await insertUser(database, "Requester");
      const groupId = await insertGroup(database, {
        name: "Padel Pals",
        createdBy: owner,
      });
      await database
        .insert(groupJoinRequests)
        .values({ groupId, userId: requester });

      expect(
        await listWaitingRequests(database, { userId: stranger, now: NOW }),
      ).toEqual([]);
    }));

  it("lists seats before Group requests, most urgent first, for the Group creator and an Appointed Organizer", () =>
    withDatabase(async (database) => {
      const owner = await insertUser(database, "Owner");
      const organizer = await insertUser(database, "Appointed");
      const omar = await insertUser(database, "Omar T");
      const jassim = await insertUser(database, "Jassim A");
      const jawad = await insertUser(database, "Jawad R");
      const groupId = await insertGroup(database, {
        name: "Tuesday Night Padel",
        createdBy: owner,
      });
      await database.insert(groupMembers).values([
        { groupId, userId: organizer, role: GroupMemberRoleEnum.ORGANIZER },
        { groupId, userId: omar },
      ]);
      const game = await insertGame(database, {
        createdBy: owner,
        groupId,
        windowStart: new Date(NOW.getTime() + 48 * HOUR),
      });
      await database
        .insert(gamePlayers)
        .values({ gameId: game.id, userId: owner });

      await database.insert(groupJoinRequests).values({
        groupId,
        userId: jawad,
        source: "invite_link",
        invitedBy: organizer,
        createdAt: new Date(NOW.getTime() - 48 * HOUR),
      });
      await database.insert(gameLevelRangeRequests).values({
        gameId: game.id,
        userId: omar,
      });
      await database.insert(groupJoinRequests).values({
        groupId,
        userId: jassim,
        source: "invite_link",
        invitedBy: owner,
        heldGameId: game.id,
        seatHeldUntil: new Date(NOW.getTime() + 21 * HOUR),
      });

      for (const viewer of [owner, organizer]) {
        const list = await listWaitingRequests(database, {
          userId: viewer,
          now: NOW,
        });
        expect(
          list.map((request) => [request.kind, request.user.name]),
        ).toEqual([
          ["seat_hold", "Jassim A"],
          ["level_range", "Omar T"],
          ["group_join", "Jawad R"],
        ]);
      }

      const [seatHold, levelRange, groupJoin] = await listWaitingRequests(
        database,
        { userId: owner, now: NOW },
      );
      expect(seatHold).toMatchObject({
        kind: "seat_hold",
        invitedByViewer: true,
        group: { id: groupId, name: "Tuesday Night Padel" },
        game: {
          id: game.id,
          registeredCount: 1,
          capacity: 4,
          groupName: "Tuesday Night Padel",
        },
      });
      expect(levelRange).toMatchObject({
        kind: "level_range",
        requesterInGroup: true,
        levelTenths: null,
      });
      expect(groupJoin).toMatchObject({
        kind: "group_join",
        invitedByViewer: false,
        invitedBy: { id: organizer },
        source: "invite_link",
        gamesWithMembers: 0,
      });
    }));

  it("treats a lapsed Seat hold as a Group request and skips cancelled, started and decided ones", () =>
    withDatabase(async (database) => {
      const owner = await insertUser(database, "Owner");
      const lapsed = await insertUser(database, "Lapsed");
      const late = await insertUser(database, "Late");
      const decided = await insertUser(database, "Decided");
      const groupId = await insertGroup(database, {
        name: "Friday Football",
        createdBy: owner,
        sport: "football",
      });
      const upcoming = await insertGame(database, {
        createdBy: owner,
        groupId,
        windowStart: new Date(NOW.getTime() + 24 * HOUR),
      });
      const cancelled = await insertGame(database, {
        createdBy: owner,
        groupId,
        windowStart: new Date(NOW.getTime() + 24 * HOUR),
        cancelled: true,
      });
      const started = await insertGame(database, {
        createdBy: owner,
        groupId,
        windowStart: new Date(NOW.getTime() - HOUR),
      });

      await database.insert(groupJoinRequests).values([
        {
          groupId,
          userId: lapsed,
          heldGameId: upcoming.id,
          seatHeldUntil: new Date(NOW.getTime() - HOUR),
        },
        {
          groupId,
          userId: decided,
          status: GroupJoinRequestStatusEnum.REJECTED,
        },
      ]);
      await database.insert(gameLevelRangeRequests).values([
        { gameId: cancelled.id, userId: late },
        { gameId: started.id, userId: decided },
      ]);

      const list = await listWaitingRequests(database, {
        userId: owner,
        now: NOW,
      });
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        kind: "group_join",
        user: { name: "Lapsed" },
        group: { sport: "football" },
      });
    }));

  it("counts the Games a Group requester played with its members", () =>
    withDatabase(async (database) => {
      const owner = await insertUser(database, "Owner");
      const requester = await insertUser(database, "Requester");
      const groupId = await insertGroup(database, {
        name: "Padel Pals",
        createdBy: owner,
      });
      for (const hoursAgo of [72, 48]) {
        const played = await insertGame(database, {
          createdBy: owner,
          groupId: null,
          windowStart: new Date(NOW.getTime() - hoursAgo * HOUR),
        });
        await database.insert(gamePlayers).values([
          { gameId: played.id, userId: owner },
          { gameId: played.id, userId: requester },
        ]);
      }
      await database.insert(groupJoinRequests).values({
        groupId,
        userId: requester,
        source: "group_page",
        note: "Free on Tuesdays",
      });

      const [request] = await listWaitingRequests(database, {
        userId: owner,
        now: NOW,
      });
      expect(request).toMatchObject({
        kind: "group_join",
        gamesWithMembers: 2,
        source: "group_page",
        note: "Free on Tuesdays",
      });
    }));

  it("lists a Level range request on a groupless Game for its creator only", () =>
    withDatabase(async (database) => {
      const creator = await insertUser(database, "Creator");
      const other = await insertUser(database, "Other");
      const requester = await insertUser(database, "Requester");
      const game = await insertGame(database, {
        createdBy: creator,
        groupId: null,
        windowStart: new Date(NOW.getTime() + 5 * HOUR),
      });
      await database.insert(gameLevelRangeRequests).values({
        gameId: game.id,
        userId: requester,
      });

      const mine = await listWaitingRequests(database, {
        userId: creator,
        now: NOW,
      });
      expect(mine).toMatchObject([
        {
          kind: "level_range",
          requesterInGroup: false,
          game: { groupId: null, groupName: null },
        },
      ]);
      expect(
        await listWaitingRequests(database, { userId: other, now: NOW }),
      ).toEqual([]);

      await database
        .update(gameLevelRangeRequests)
        .set({ status: "approved" })
        .where(eq(gameLevelRangeRequests.gameId, game.id));
      expect(
        await listWaitingRequests(database, { userId: creator, now: NOW }),
      ).toEqual([]);
    }));
});
