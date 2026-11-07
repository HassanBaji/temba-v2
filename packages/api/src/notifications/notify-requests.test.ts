import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  gameInviteLinks,
  games,
  groupMembers,
  matches,
  notifications,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "#src/routers/games/byId";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { joinGroupFromInviteLink } from "#src/routers/games/joinGroupFromInviteLink";
import { approveLevelRangeRequest } from "#src/routers/games/approveLevelRangeRequest";
import { rejectLevelRangeRequest } from "#src/routers/games/rejectLevelRangeRequest";
import { requestLevelRange } from "#src/routers/games/requestLevelRange";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { rejectJoinRequest } from "#src/routers/groups/rejectJoinRequest";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { setOrganizer } from "#src/routers/groups/setOrganizer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

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

async function insertGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string; levelRange?: boolean },
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue!.id,
      createdBy: args.createdBy,
      groupId: args.groupId,
      playersAllowed: 4,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
      levelMinTenths: args.levelRange ? 40 : null,
      levelMaxTenths: args.levelRange ? 60 : null,
    })
    .returning();
  await database.insert(matches).values({ gameId: game!.id });
  return game!;
}

async function mintToken(
  database: TestDatabase,
  gameId: string,
  userId: string,
) {
  const created = await createInviteLink(database, {
    gameId,
    userId,
    origin: "https://temba.test",
  });
  const row = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.id, created.id),
  });
  return row!.token;
}

async function noticesOf(database: TestDatabase, type: string) {
  return database.query.notifications.findMany({
    where: eq(notifications.type, type as "group_join_requested"),
    columns: {
      recipientUserId: true,
      actorUserId: true,
      audience: true,
      gameId: true,
      groupId: true,
    },
  });
}

/** An approval Group with its creator and one Appointed Organizer. */
async function approvalGroup(database: TestDatabase) {
  const creator = await insertUser(database, "Yousif Kadhem");
  const organizer = await insertUser(database, "Ali Mahmood");
  const group = await createLoosePublic(database, {
    name: "Gooz of Arad",
    sport: "padel",
    userId: creator,
    requiresApproval: true,
  });
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: organizer });
  await setOrganizer(database, {
    groupId: group.id,
    approverUserId: creator,
    userId: organizer,
    organizer: true,
  });
  return { creator, organizer, groupId: group.id };
}

describe("request Notifications", () => {
  it("tells every Group approver about a Seat hold and the requester about the answer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { creator, organizer, groupId } = await approvalGroup(db);
      const requester = await insertUser(db, "Hassan Haji");
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      const sent = await joinGroupFromInviteLink(db, {
        token,
        userId: requester,
        holdSeat: true,
        sideIndex: 1,
        position: "left",
      });
      const asked = await noticesOf(db, "group_join_requested");
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [creator, organizer].sort(),
      );
      expect(asked[0]).toMatchObject({
        actorUserId: requester,
        audience: "admin",
        gameId: game.id,
        groupId,
      });

      const forOrganizer = await gameById(db, {
        gameId: game.id,
        userId: organizer,
      });
      expect(forOrganizer.pendingSeatHolds.map((row) => row.user.id)).toEqual([
        requester,
      ]);
      expect(forOrganizer.pendingSeatHolds[0]).toMatchObject({
        groupName: "Gooz of Arad",
        invitedBy: { id: creator, name: "Yousif Kadhem" },
      });
      const forRequester = await gameById(db, {
        gameId: game.id,
        userId: requester,
      }).catch((error: unknown) => error);
      expect(forRequester).toBeInstanceOf(Error);

      if (sent.outcome !== "requested") {
        throw new Error("Expected a request");
      }
      await approveJoinRequest(db, {
        requestId: sent.requestId,
        userId: organizer,
      });
      const approved = await noticesOf(db, "group_join_approved");
      expect(approved).toEqual([
        {
          recipientUserId: requester,
          actorUserId: organizer,
          audience: "player",
          gameId: game.id,
          groupId,
        },
      ]);
    } finally {
      await close();
    }
  });

  it("tells the requester who declined, and drops the hold", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { creator, groupId } = await approvalGroup(db);
      const requester = await insertUser(db, "Hassan Haji");
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);
      const sent = await joinGroupFromInviteLink(db, {
        token,
        userId: requester,
        holdSeat: true,
        sideIndex: 1,
        position: "left",
      });
      if (sent.outcome !== "requested") {
        throw new Error("Expected a request");
      }

      await rejectJoinRequest(db, {
        requestId: sent.requestId,
        userId: creator,
      });

      const declined = await noticesOf(db, "group_join_declined");
      expect(declined).toMatchObject([
        { recipientUserId: requester, actorUserId: creator, gameId: game.id },
      ]);
      const forCreator = await gameById(db, {
        gameId: game.id,
        userId: creator,
      });
      expect(forCreator.pendingSeatHolds).toEqual([]);
    } finally {
      await close();
    }
  });

  it("notifies approvers of a request from the Group page, without a Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { creator, organizer, groupId } = await approvalGroup(db);
      const requester = await insertUser(db, "Sara Haddad");

      await requestJoin(db, { groupId, userId: requester });

      const asked = await noticesOf(db, "group_join_requested");
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [creator, organizer].sort(),
      );
      expect(asked.every((row) => row.gameId === null)).toBe(true);
    } finally {
      await close();
    }
  });

  it("carries a Level range request to the Game admins and the answer back", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { creator, organizer, groupId } = await approvalGroup(db);
      const member = await insertUser(db, "Omar T");
      await db.insert(groupMembers).values({ groupId, userId: member });
      const game = await insertGame(db, {
        createdBy: creator,
        groupId,
        levelRange: true,
      });

      const request = await requestLevelRange(db, {
        gameId: game.id,
        userId: member,
      });
      const asked = await noticesOf(db, "game_level_range_requested");
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [creator, organizer].sort(),
      );
      expect(asked[0]).toMatchObject({ actorUserId: member, gameId: game.id });

      await rejectLevelRangeRequest(db, {
        requestId: request.id,
        userId: creator,
      });
      expect(await noticesOf(db, "game_level_range_declined")).toMatchObject([
        { recipientUserId: member, actorUserId: creator, audience: "player" },
      ]);

      const again = await requestLevelRange(db, {
        gameId: game.id,
        userId: member,
      });
      await approveLevelRangeRequest(db, {
        requestId: again.id,
        userId: organizer,
      });
      expect(await noticesOf(db, "game_level_range_approved")).toMatchObject([
        { recipientUserId: member, actorUserId: organizer, gameId: game.id },
      ]);
      expect(
        await db.query.notifications.findMany({
          where: and(
            eq(notifications.type, "game_level_range_requested"),
            eq(notifications.recipientUserId, member),
          ),
        }),
      ).toEqual([]);
    } finally {
      await close();
    }
  });
});
