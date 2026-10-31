import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  GameFormatEnum,
  gameInviteLinks,
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  groups,
  GroupTypeEnum,
  matches,
  notifications,
  user,
  venues,
} from "@repo/db/schema";

import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";
const HOUR = 60 * 60 * 1000;

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertVenue(database: TestDatabase) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  return venue.id;
}

async function insertLooseGroup(
  database: TestDatabase,
  createdBy: string,
  type: GroupTypeEnum = GroupTypeEnum.PRIVATE,
) {
  const [group] = await database
    .insert(groups)
    .values({ name: "Loose Squad", type, createdBy })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: createdBy });
  return group.id;
}

async function insertClubGroup(database: TestDatabase, ownerId: string) {
  const [community] = await database
    .insert(communities)
    .values({ name: "Link Club", type: "private", createdBy: ownerId })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communityMembers).values({
    communityId: community.id,
    userId: ownerId,
    role: CommunityRoleEnum.OWNER,
  });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Club Squad",
      type: GroupTypeEnum.PRIVATE,
      createdBy: ownerId,
      communityId: community.id,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: ownerId });
  return { communityId: community.id, groupId: group.id };
}

async function insertFriendlyGroupGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string; isPublic?: boolean },
) {
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: await insertVenue(database),
      createdBy: args.createdBy,
      groupId: args.groupId,
      isPublic: args.isPublic ?? false,
      playersAllowed: 4,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: game.id });
  return game;
}

async function mintToken(
  database: TestDatabase,
  gameId: string,
  organizerId: string,
) {
  const created = await createInviteLink(database, {
    gameId,
    userId: organizerId,
    origin: ORIGIN,
  });
  const row = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.id, created.id),
  });
  if (!row) {
    throw new Error("Invite link row missing");
  }
  return row.token;
}

async function groupMembershipRows(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  return database.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
  });
}

async function isOnGame(
  database: TestDatabase,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
  });
  return Boolean(row);
}

function expectTrpc(error: unknown, code: TRPCError["code"], message: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (error instanceof TRPCError) {
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  }
}

describe("Group Game Invite link joins the Group", () => {
  it("adds a non-member to a private Loose Group as they register", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "loose-creator@example.com");
      const joiner = await insertUser(db, "loose-joiner@example.com");
      const groupId = await insertLooseGroup(db, creator);
      const game = await insertFriendlyGroupGame(db, {
        createdBy: creator,
        groupId,
      });
      const token = await mintToken(db, game.id, creator);

      const result = await acceptInviteLink(db, {
        token,
        userId: joiner,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        gameId: game.id,
        outcome: "registered",
        joinedGroup: true,
      });
      expect(await groupMembershipRows(db, groupId, joiner)).toHaveLength(1);
      expect(await isOnGame(db, game.id, joiner)).toBe(true);
      const joinedNotices = await db.query.notifications.findMany({
        where: eq(notifications.type, "group_member_joined"),
      });
      expect(joinedNotices.map((row) => row.recipientUserId)).toEqual([
        creator,
      ]);
    } finally {
      await close();
    }
  });

  it("admits an outsider to the Community and the Club Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-owner@example.com");
      const outsider = await insertUser(db, "club-outsider@example.com");
      const { communityId, groupId } = await insertClubGroup(db, owner);
      const game = await insertFriendlyGroupGame(db, {
        createdBy: owner,
        groupId,
      });
      const token = await mintToken(db, game.id, owner);

      const result = await acceptInviteLink(db, {
        token,
        userId: outsider,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        outcome: "registered",
        joinedGroup: true,
      });
      const membership = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, outsider),
        ),
      });
      expect(membership?.role).toBe(CommunityRoleEnum.MEMBER);
      expect(await groupMembershipRows(db, groupId, outsider)).toHaveLength(1);
      expect(await isOnGame(db, game.id, outsider)).toBe(true);
    } finally {
      await close();
    }
  });

  it("leaves an existing member's membership alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "member-creator@example.com");
      const member = await insertUser(db, "member-joiner@example.com");
      const groupId = await insertLooseGroup(db, creator);
      await db.insert(groupMembers).values({ groupId, userId: member });
      const game = await insertFriendlyGroupGame(db, {
        createdBy: creator,
        groupId,
      });
      const token = await mintToken(db, game.id, creator);

      const result = await acceptInviteLink(db, {
        token,
        userId: member,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        outcome: "registered",
        joinedGroup: false,
      });
      expect(await groupMembershipRows(db, groupId, member)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("refuses a blocked User on a private Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "blocked-creator@example.com");
      const blocked = await insertUser(db, "blocked-joiner@example.com");
      const groupId = await insertLooseGroup(db, creator, GroupTypeEnum.PUBLIC);
      await db.insert(groupJoinRequests).values({
        groupId,
        userId: blocked,
        status: GroupJoinRequestStatusEnum.BLOCKED,
        decidedBy: creator,
        source: "group_page",
      });
      const game = await insertFriendlyGroupGame(db, {
        createdBy: creator,
        groupId,
      });
      const token = await mintToken(db, game.id, creator);

      await expect(
        acceptInviteLink(db, {
          token,
          userId: blocked,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN", "You can't join this Group");
        return true;
      });
      expect(await groupMembershipRows(db, groupId, blocked)).toHaveLength(0);
      expect(await isOnGame(db, game.id, blocked)).toBe(false);
    } finally {
      await close();
    }
  });

  it("registers a blocked User on a public Group Game without joining", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-creator@example.com");
      const blocked = await insertUser(db, "public-blocked@example.com");
      const groupId = await insertLooseGroup(db, creator, GroupTypeEnum.PUBLIC);
      await db.insert(groupJoinRequests).values({
        groupId,
        userId: blocked,
        status: GroupJoinRequestStatusEnum.BLOCKED,
        decidedBy: creator,
        source: "group_page",
      });
      const game = await insertFriendlyGroupGame(db, {
        createdBy: creator,
        groupId,
        isPublic: true,
      });
      const token = await mintToken(db, game.id, creator);

      const result = await acceptInviteLink(db, {
        token,
        userId: blocked,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        outcome: "registered",
        joinedGroup: false,
      });
      expect(await groupMembershipRows(db, groupId, blocked)).toHaveLength(0);
      expect(await isOnGame(db, game.id, blocked)).toBe(true);
    } finally {
      await close();
    }
  });

  it("rolls the Group join back when the registration is refused", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "rollback-creator@example.com");
      const joiner = await insertUser(db, "rollback-joiner@example.com");
      const groupId = await insertLooseGroup(db, creator);
      const game = await insertFriendlyGroupGame(db, {
        createdBy: creator,
        groupId,
      });
      const token = await mintToken(db, game.id, creator);

      await expect(
        acceptInviteLink(db, { token, userId: joiner }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "BAD_REQUEST", "Pick a vacant Position");
        return true;
      });
      expect(await groupMembershipRows(db, groupId, joiner)).toHaveLength(0);
      expect(await isOnGame(db, game.id, joiner)).toBe(false);
    } finally {
      await close();
    }
  });
});
