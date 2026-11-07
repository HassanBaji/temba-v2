import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  gameInviteLinks,
  games,
  groupJoinRequests,
  groupMembers,
  groups,
  GroupTypeEnum,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listGameSides } from "#src/games/seats";
import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { withdrawJoinRequest } from "#src/routers/groups/withdrawJoinRequest";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { joinGroupFromInviteLink } from "#src/routers/games/joinGroupFromInviteLink";
import { previewInviteLink } from "#src/routers/games/previewInviteLink";
import { registerSeat } from "#src/routers/games/registerSeat";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";
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

async function insertPrivateGroup(database: TestDatabase, createdBy: string) {
  const [group] = await database
    .insert(groups)
    .values({ name: "Loose Squad", type: GroupTypeEnum.PRIVATE, createdBy })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: createdBy });
  return group.id;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    groupId: string;
    windowStart?: Date;
    isPublic?: boolean;
  },
) {
  const windowStart = args.windowStart ?? new Date(Date.now() + 24 * HOUR);
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
  userId: string,
) {
  const created = await createInviteLink(database, {
    gameId,
    userId,
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

async function isMember(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  const row = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
  });
  return Boolean(row);
}

async function seatOf(
  database: TestDatabase,
  game: typeof games.$inferSelect,
  userId: string,
) {
  for (const side of await listGameSides(database, game)) {
    for (const position of ["left", "right"] as const) {
      if (side[position]?.userId === userId) {
        return { sideIndex: side.sideIndex, position };
      }
    }
  }
  return null;
}

async function pendingRequest(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  return database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, groupId),
      eq(groupJoinRequests.userId, userId),
    ),
  });
}

async function approvalGroup(database: TestDatabase, creator: string) {
  const group = await createLoosePublic(database, {
    name: "Gooz of Arad",
    sport: "padel",
    userId: creator,
    requiresApproval: true,
  });
  return group.id;
}

function expectTrpc(error: unknown, code: TRPCError["code"], message?: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (error instanceof TRPCError) {
    expect(error.code).toBe(code);
    if (message) {
      expect(error.message).toBe(message);
    }
  }
}

describe("Game Invite link: the Group behind it", () => {
  it("previews the Group and how the viewer stands to it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Yousif Kadhem");
      const member = await insertUser(db, "Ali Mahmood");
      const outsider = await insertUser(db, "Hassan Hamad");
      const groupId = await insertPrivateGroup(db, creator);
      await db.insert(groupMembers).values({ groupId, userId: member });
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      const forOutsider = await previewInviteLink(db, {
        token,
        userId: outsider,
      });
      expect(forOutsider.status).toBe("ready");
      if (forOutsider.status !== "ready") {
        return;
      }
      expect(forOutsider.group).toMatchObject({
        id: groupId,
        name: "Loose Squad",
        memberCount: 2,
        memberNames: ["Yousif Kadhem", "Ali Mahmood"],
        joinMode: "join",
        sharedBy: { name: "Yousif Kadhem" },
        pendingRequest: null,
      });

      const forMember = await previewInviteLink(db, { token, userId: member });
      expect(forMember.status === "ready" && forMember.group?.joinMode).toBe(
        "member",
      );
      const signedOut = await previewInviteLink(db, { token });
      expect(signedOut.status === "ready" && signedOut.group).toBeNull();
    } finally {
      await close();
    }
  });

  it("joins the Group only, leaving the seat open", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Open Creator");
      const joiner = await insertUser(db, "Open Joiner");
      const groupId = await insertPrivateGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      const result = await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
      });

      expect(result).toEqual({ outcome: "joined", groupId });
      expect(await isMember(db, groupId, joiner)).toBe(true);
      expect(await seatOf(db, game, joiner)).toBeNull();
      expect(
        await joinGroupFromInviteLink(db, { token, userId: joiner }),
      ).toEqual({ outcome: "already_member", groupId });
      const preview = await previewInviteLink(db, { token, userId: joiner });
      expect(preview.status === "ready" && preview.group?.joinMode).toBe(
        "member",
      );
    } finally {
      await close();
    }
  });

  it("refuses a Seat hold where the Group lets anyone with the link in", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Hold Creator");
      const joiner = await insertUser(db, "Hold Joiner");
      const groupId = await insertPrivateGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      await expect(
        joinGroupFromInviteLink(db, { token, userId: joiner, holdSeat: true }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "BAD_REQUEST");
        return true;
      });
      expect(await isMember(db, groupId, joiner)).toBe(false);
    } finally {
      await close();
    }
  });

  it("sends a join request without a hold on an approval Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Approval Creator");
      const joiner = await insertUser(db, "Approval Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      const before = await previewInviteLink(db, { token, userId: joiner });
      expect(before.status === "ready" && before.group?.joinMode).toBe(
        "request",
      );

      const result = await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
      });
      expect(result).toMatchObject({
        outcome: "requested",
        groupId,
        seatHeldUntil: null,
      });
      const request = await pendingRequest(db, groupId, joiner);
      expect(request).toMatchObject({
        status: "pending",
        source: "invite_link",
        invitedBy: creator,
        heldGameId: null,
      });
      expect(await isMember(db, groupId, joiner)).toBe(false);

      const after = await previewInviteLink(db, { token, userId: joiner });
      expect(after.status === "ready" && after.group).toMatchObject({
        joinMode: "requested",
        pendingRequest: { id: request?.id, seatHeldUntil: null },
      });

      await approveJoinRequest(db, { requestId: request!.id, userId: creator });
      expect(await isMember(db, groupId, joiner)).toBe(true);
      expect(await seatOf(db, game, joiner)).toBeNull();
    } finally {
      await close();
    }
  });

  it("holds the seat for 24 hours and seats the requester on approval", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Seat Creator");
      const joiner = await insertUser(db, "Seat Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);
      const now = new Date();

      const result = await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
        holdSeat: true,
        sideIndex: 1,
        position: "right",
        now,
      });
      expect(result.outcome).toBe("requested");
      expect(result.seatHeldUntil?.getTime()).toBe(now.getTime() + 24 * HOUR);
      const request = await pendingRequest(db, groupId, joiner);
      expect(request).toMatchObject({
        heldGameId: game.id,
        heldSeat: { kind: "position", sideIndex: 1, position: "right" },
      });
      expect(await seatOf(db, game, joiner)).toBeNull();

      const preview = await previewInviteLink(db, { token, userId: joiner });
      expect(
        preview.status === "ready" &&
          preview.group?.pendingRequest?.seatHeldUntil,
      ).toEqual(request?.seatHeldUntil);

      const approved = await approveJoinRequest(db, {
        requestId: request!.id,
        userId: creator,
      });
      expect(approved).toEqual({ ok: true, heldSeat: "registered" });
      expect(await isMember(db, groupId, joiner)).toBe(true);
      expect(await seatOf(db, game, joiner)).toEqual({
        sideIndex: 1,
        position: "right",
      });
    } finally {
      await close();
    }
  });

  it("lets a lapsed hold go but still approves the membership", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Lapsed Creator");
      const joiner = await insertUser(db, "Lapsed Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
        holdSeat: true,
        sideIndex: 1,
        position: "left",
        now: new Date(Date.now() - 25 * HOUR),
      });
      const request = await pendingRequest(db, groupId, joiner);
      const approved = await approveJoinRequest(db, {
        requestId: request!.id,
        userId: creator,
      });
      expect(approved).toEqual({ ok: true, heldSeat: "lapsed" });
      expect(await isMember(db, groupId, joiner)).toBe(true);
      expect(await seatOf(db, game, joiner)).toBeNull();
    } finally {
      await close();
    }
  });

  it("falls back to another vacant seat when the held one went", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Taken Creator");
      const joiner = await insertUser(db, "Taken Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);
      await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
        holdSeat: true,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: creator,
        sideIndex: 1,
        position: "left",
      });

      const request = await pendingRequest(db, groupId, joiner);
      const approved = await approveJoinRequest(db, {
        requestId: request!.id,
        userId: creator,
      });
      expect(approved.heldSeat).toBe("registered");
      expect(await seatOf(db, game, joiner)).toEqual({
        sideIndex: 1,
        position: "right",
      });
    } finally {
      await close();
    }
  });

  it("withdraws the requester's own pending request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Withdraw Creator");
      const joiner = await insertUser(db, "Withdraw Joiner");
      const other = await insertUser(db, "Withdraw Other");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);
      const sent = await joinGroupFromInviteLink(db, {
        token,
        userId: joiner,
        holdSeat: true,
        sideIndex: 2,
        position: "left",
      });
      if (sent.outcome !== "requested") {
        throw new Error("Expected a request");
      }

      await expect(
        withdrawJoinRequest(db, { requestId: sent.requestId, userId: other }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "NOT_FOUND");
        return true;
      });
      expect(
        await withdrawJoinRequest(db, {
          requestId: sent.requestId,
          userId: joiner,
        }),
      ).toEqual({ ok: true, groupId });
      expect(await pendingRequest(db, groupId, joiner)).toBeUndefined();
      const preview = await previewInviteLink(db, { token, userId: joiner });
      expect(preview.status === "ready" && preview.group?.joinMode).toBe(
        "request",
      );
    } finally {
      await close();
    }
  });

  it("refuses a non-member's one-tap join on an approval Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Bypass Creator");
      const joiner = await insertUser(db, "Bypass Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, { createdBy: creator, groupId });
      const token = await mintToken(db, game.id, creator);

      await expect(
        acceptInviteLink(db, {
          token,
          userId: joiner,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "FORBIDDEN",
          "This group's organizers approve new members. Send a request to join first.",
        );
        return true;
      });
      expect(await isMember(db, groupId, joiner)).toBe(false);
      expect(await seatOf(db, game, joiner)).toBeNull();
      expect(await pendingRequest(db, groupId, joiner)).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("keeps a member's one-tap join on an approval Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Member Creator");
      const member = await insertUser(db, "Member Joiner");
      const groupId = await approvalGroup(db, creator);
      await db.insert(groupMembers).values({ groupId, userId: member });
      const game = await insertGame(db, { createdBy: creator, groupId });
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
      expect(await seatOf(db, game, member)).toEqual({
        sideIndex: 1,
        position: "left",
      });
    } finally {
      await close();
    }
  });

  it("seats a non-member on a public Game of an approval Group without joining it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Public Creator");
      const joiner = await insertUser(db, "Public Joiner");
      const groupId = await approvalGroup(db, creator);
      const game = await insertGame(db, {
        createdBy: creator,
        groupId,
        isPublic: true,
      });
      const token = await mintToken(db, game.id, creator);

      const result = await acceptInviteLink(db, {
        token,
        userId: joiner,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        outcome: "registered",
        joinedGroup: false,
      });
      expect(await isMember(db, groupId, joiner)).toBe(false);
      expect(await seatOf(db, game, joiner)).toEqual({
        sideIndex: 1,
        position: "left",
      });
    } finally {
      await close();
    }
  });

  it("still joins a non-member to a public Group that lets anyone in", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "Open Public Creator");
      const joiner = await insertUser(db, "Open Public Joiner");
      const group = await createLoosePublic(db, {
        name: "Open Arad",
        sport: "padel",
        userId: creator,
        requiresApproval: false,
      });
      const game = await insertGame(db, {
        createdBy: creator,
        groupId: group.id,
      });
      const token = await mintToken(db, game.id, creator);

      const result = await acceptInviteLink(db, {
        token,
        userId: joiner,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toMatchObject({
        outcome: "registered",
        joinedGroup: true,
      });
      expect(await isMember(db, group.id, joiner)).toBe(true);
    } finally {
      await close();
    }
  });
});
