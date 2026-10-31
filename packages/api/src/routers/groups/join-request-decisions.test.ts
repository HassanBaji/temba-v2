import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupInviteLinks,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  GroupMemberRoleEnum,
  GroupSportEnum,
  ratings,
  user,
} from "@repo/db/schema";

import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { acceptInviteLink } from "#src/routers/groups/acceptInviteLink";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { groupById } from "#src/routers/groups/byId";
import { createClubPublic } from "#src/routers/groups/createClubPublic";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinClubPublic } from "#src/routers/groups/joinClubPublic";
import { joinLoosePublic } from "#src/routers/groups/joinLoosePublic";
import { listJoinRequests } from "#src/routers/groups/listJoinRequests";
import { previewInviteLink } from "#src/routers/groups/previewInviteLink";
import { rejectJoinRequest } from "#src/routers/groups/rejectJoinRequest";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { setRequiresApproval } from "#src/routers/groups/setRequiresApproval";
import { undoJoinRequestDecision } from "#src/routers/groups/undoJoinRequestDecision";
import { groupJoinMode } from "#src/groups/helpers/group-join-mode";
import { requireGroup } from "#src/groups/helpers/require-group";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertCommunity(database: TestDatabase, ownerId: string) {
  const [community] = await database
    .insert(communities)
    .values({ name: "Club", type: "public", createdBy: ownerId })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communitySports).values({
    communityId: community.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values({
    communityId: community.id,
    userId: ownerId,
    role: CommunityRoleEnum.OWNER,
  });
  return community;
}

async function gatedGroup(database: TestDatabase, creatorId: string) {
  return createLoosePublic(database, {
    name: "Gated Crew",
    sport: "padel",
    userId: creatorId,
    requiresApproval: true,
  });
}

async function mintLink(
  database: TestDatabase,
  args: { groupId: string; userId: string },
) {
  await createInviteLink(database, {
    groupId: args.groupId,
    userId: args.userId,
    origin: "http://localhost:3000",
  });
  const link = await database.query.groupInviteLinks.findFirst({
    where: eq(groupInviteLinks.groupId, args.groupId),
  });
  if (!link) {
    throw new Error("Failed to mint Invite link");
  }
  return link;
}

async function findMembership(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  return database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
  });
}

async function findRequest(database: TestDatabase, requestId: string) {
  return database.query.groupJoinRequests.findFirst({
    where: eq(groupJoinRequests.id, requestId),
  });
}

function expectTrpc(code: TRPCError["code"], message?: string) {
  return (error: unknown) => {
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe(code);
      if (message) {
        expect(error.message).toBe(message);
      }
    }
    return true;
  };
}

describe("group join request decisions", () => {
  it("stores the note and source, and a re-request overwrites them", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "note-creator@example.com");
      const joiner = await insertUser(db, "note-joiner@example.com");
      const group = await gatedGroup(db, creator.id);

      const first = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
        note: "I play twice a week",
      });
      expect(await findRequest(db, first.id)).toMatchObject({
        note: "I play twice a week",
        source: "group_page",
        invitedBy: null,
      });

      await rejectJoinRequest(db, { requestId: first.id, userId: creator.id });
      const again = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(again.id).toBe(first.id);
      expect(await findRequest(db, first.id)).toMatchObject({
        status: GroupJoinRequestStatusEnum.PENDING,
        note: null,
        source: "group_page",
        decidedBy: null,
      });

      const owner = await insertUser(db, "note-owner@example.com");
      const community = await insertCommunity(db, owner.id);
      const clubGroup = await createClubPublic(db, {
        communityId: community.id,
        name: "Club Crew",
        sport: "padel",
        userId: owner.id,
        requiresApproval: true,
      });
      const clubRequest = await requestJoin(db, {
        groupId: clubGroup.id,
        userId: joiner.id,
      });
      expect((await findRequest(db, clubRequest.id))?.source).toBe("community");
    } finally {
      await close();
    }
  });

  it("blocks a requester from requesting, joining, or using an invite link", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "block-creator@example.com");
      const joiner = await insertUser(db, "block-joiner@example.com");
      const group = await gatedGroup(db, creator.id);

      const request = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(
        await rejectJoinRequest(db, {
          requestId: request.id,
          userId: creator.id,
          block: true,
        }),
      ).toEqual({ ok: true });
      expect((await findRequest(db, request.id))?.status).toBe(
        GroupJoinRequestStatusEnum.BLOCKED,
      );

      await expect(
        requestJoin(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy(expectTrpc("BAD_REQUEST"));
      expect(
        await groupJoinMode(db, await requireGroup(db, group.id), joiner.id),
      ).toBe("none");

      await setRequiresApproval(db, {
        groupId: group.id,
        userId: creator.id,
        requiresApproval: false,
      });
      await expect(
        joinLoosePublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy(expectTrpc("FORBIDDEN", "You can't join this Group"));

      const link = await mintLink(db, {
        groupId: group.id,
        userId: creator.id,
      });
      await expect(
        acceptInviteLink(db, { token: link.token, userId: joiner.id }),
      ).rejects.toSatisfy(expectTrpc("FORBIDDEN", "You can't join this Group"));
      expect(await findMembership(db, group.id, joiner.id)).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("refuses joinClubPublic for a blocked Community Member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-block-owner@example.com");
      const joiner = await insertUser(db, "club-block-joiner@example.com");
      const community = await insertCommunity(db, owner.id);
      await db.insert(communityMembers).values({
        communityId: community.id,
        userId: joiner.id,
        role: CommunityRoleEnum.MEMBER,
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Club Crew",
        sport: "padel",
        userId: owner.id,
      });
      await db.insert(groupJoinRequests).values({
        groupId: group.id,
        userId: joiner.id,
        status: GroupJoinRequestStatusEnum.BLOCKED,
        decidedBy: owner.id,
      });

      await expect(
        joinClubPublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy(expectTrpc("FORBIDDEN", "You can't join this Group"));
    } finally {
      await close();
    }
  });

  it("undoes an approval by removing the member and reopening the request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "undo-creator@example.com");
      const joiner = await insertUser(db, "undo-joiner@example.com");
      const group = await gatedGroup(db, creator.id);
      const request = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      await approveJoinRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });
      expect(await findMembership(db, group.id, joiner.id)).toBeTruthy();

      expect(
        await undoJoinRequestDecision(db, {
          requestId: request.id,
          userId: creator.id,
        }),
      ).toEqual({ ok: true });

      expect(await findMembership(db, group.id, joiner.id)).toBeUndefined();
      expect(await findRequest(db, request.id)).toMatchObject({
        status: GroupJoinRequestStatusEnum.PENDING,
        decidedBy: null,
      });

      await expect(
        undoJoinRequestDecision(db, {
          requestId: request.id,
          userId: creator.id,
        }),
      ).rejects.toSatisfy(expectTrpc("BAD_REQUEST"));
    } finally {
      await close();
    }
  });

  it("refuses to undo an approval once the member has played or organizes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "played-creator@example.com");
      const player = await insertUser(db, "played-player@example.com");
      const organizer = await insertUser(db, "played-organizer@example.com");
      const stranger = await insertUser(db, "played-stranger@example.com");
      const group = await gatedGroup(db, creator.id);

      const playerRequest = await requestJoin(db, {
        groupId: group.id,
        userId: player.id,
      });
      await approveJoinRequest(db, {
        requestId: playerRequest.id,
        userId: creator.id,
      });
      await db
        .update(groupMembers)
        .set({ totalGamesPlayed: 1 })
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, player.id),
          ),
        );

      await expect(
        undoJoinRequestDecision(db, {
          requestId: playerRequest.id,
          userId: stranger.id,
        }),
      ).rejects.toSatisfy(expectTrpc("FORBIDDEN"));
      await expect(
        undoJoinRequestDecision(db, {
          requestId: playerRequest.id,
          userId: creator.id,
        }),
      ).rejects.toSatisfy(
        expectTrpc("BAD_REQUEST", "They have already played in this Group"),
      );
      expect(await findMembership(db, group.id, player.id)).toBeTruthy();
      expect((await findRequest(db, playerRequest.id))?.status).toBe(
        GroupJoinRequestStatusEnum.APPROVED,
      );

      const organizerRequest = await requestJoin(db, {
        groupId: group.id,
        userId: organizer.id,
      });
      await approveJoinRequest(db, {
        requestId: organizerRequest.id,
        userId: creator.id,
      });
      await db
        .update(groupMembers)
        .set({ role: GroupMemberRoleEnum.ORGANIZER })
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, organizer.id),
          ),
        );
      await expect(
        undoJoinRequestDecision(db, {
          requestId: organizerRequest.id,
          userId: creator.id,
        }),
      ).rejects.toSatisfy(expectTrpc("BAD_REQUEST"));
      expect(await findMembership(db, group.id, organizer.id)).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("undoes a block so the User can request again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "unblock-creator@example.com");
      const joiner = await insertUser(db, "unblock-joiner@example.com");
      const group = await gatedGroup(db, creator.id);
      const request = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      await rejectJoinRequest(db, {
        requestId: request.id,
        userId: creator.id,
        block: true,
      });

      await undoJoinRequestDecision(db, {
        requestId: request.id,
        userId: creator.id,
      });
      expect((await findRequest(db, request.id))?.status).toBe(
        GroupJoinRequestStatusEnum.PENDING,
      );
      await rejectJoinRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const again = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(again).toEqual({ id: request.id, status: "pending" });
    } finally {
      await close();
    }
  });

  it("lists each request's note, source, inviter, and Level in the Group's sport", async () => {
    const { db, close } = await createPgliteDb();
    const now = new Date("2026-06-01T10:00:00Z");
    try {
      const creator = await insertUser(db, "list-creator@example.com");
      const rated = await insertUser(db, "list-rated@example.com");
      const invited = await insertUser(db, "list-invited@example.com");
      const group = await gatedGroup(db, creator.id);

      await requestJoin(db, {
        groupId: group.id,
        userId: rated.id,
        note: "Left side player",
      });
      const [rating] = await db
        .insert(ratings)
        .values([
          {
            userId: rated.id,
            sport: GroupSportEnum.PADEL,
            mu: 1900,
            phi: 190,
            sigma: 0.06,
            levelBand: "C1",
            lastRatedAt: now,
          },
          {
            userId: invited.id,
            sport: GroupSportEnum.FOOTBALL,
            mu: 1500,
            phi: 300,
            sigma: 0.06,
            levelBand: "C1",
          },
        ])
        .returning();
      if (!rating) {
        throw new Error("Failed to insert rating");
      }
      const link = await mintLink(db, {
        groupId: group.id,
        userId: creator.id,
      });
      await acceptInviteLink(db, { token: link.token, userId: invited.id });

      const listed = await listJoinRequests(db, {
        groupId: group.id,
        userId: creator.id,
        now,
      });
      const view = youRatingViewAfterIdle(rating, now);
      expect(listed).toHaveLength(2);
      expect(listed[0]).toMatchObject({
        user: { id: rated.id },
        note: "Left side player",
        source: "group_page",
        invitedBy: null,
        level: {
          levelBand: view.levelBand,
          provisional: view.provisional,
          level: view.level,
        },
      });
      expect(listed[1]).toMatchObject({
        user: { id: invited.id },
        note: null,
        source: "invite_link",
        invitedBy: { id: creator.id, name: creator.name },
        level: null,
      });
    } finally {
      await close();
    }
  });

  it("turns an invite link on an approval-required Public Group into a pending request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "link-creator@example.com");
      const joiner = await insertUser(db, "link-joiner@example.com");
      const group = await gatedGroup(db, creator.id);
      const link = await mintLink(db, {
        groupId: group.id,
        userId: creator.id,
      });

      expect(await previewInviteLink(db, { token: link.token })).toEqual({
        status: "ready",
        groupName: "Gated Crew",
        requiresApproval: true,
      });

      expect(
        await acceptInviteLink(db, { token: link.token, userId: joiner.id }),
      ).toEqual({ groupId: group.id, alreadyMember: false, requested: true });
      expect(await findMembership(db, group.id, joiner.id)).toBeUndefined();

      const request = await db.query.groupJoinRequests.findFirst({
        where: and(
          eq(groupJoinRequests.groupId, group.id),
          eq(groupJoinRequests.userId, joiner.id),
        ),
      });
      expect(request).toMatchObject({
        status: GroupJoinRequestStatusEnum.PENDING,
        source: "invite_link",
        invitedBy: creator.id,
        note: null,
      });

      expect(
        await acceptInviteLink(db, { token: link.token, userId: joiner.id }),
      ).toEqual({ groupId: group.id, alreadyMember: false, requested: true });
      expect(
        await db.query.groupJoinRequests.findMany({
          where: eq(groupJoinRequests.groupId, group.id),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("still admits through an invite link when approval is off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "open-link-creator@example.com");
      const joiner = await insertUser(db, "open-link-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Open Crew",
        sport: "padel",
        userId: creator.id,
      });
      const link = await mintLink(db, {
        groupId: group.id,
        userId: creator.id,
      });

      expect(await previewInviteLink(db, { token: link.token })).toMatchObject({
        requiresApproval: false,
      });
      expect(
        await acceptInviteLink(db, { token: link.token, userId: joiner.id }),
      ).toEqual({ groupId: group.id, alreadyMember: false, requested: false });
      expect(await findMembership(db, group.id, joiner.id)).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("counts today's organizer approvals only, for viewers who decide requests", async () => {
    const { db, close } = await createPgliteDb();
    const now = new Date("2026-06-01T10:00:00Z");
    try {
      const creator = await insertUser(db, "today-creator@example.com");
      const approved = await insertUser(db, "today-approved@example.com");
      const selfAdmitted = await insertUser(db, "today-self@example.com");
      const yesterday = await insertUser(db, "today-yesterday@example.com");
      const group = await gatedGroup(db, creator.id);

      await db.insert(groupJoinRequests).values([
        {
          groupId: group.id,
          userId: approved.id,
          status: GroupJoinRequestStatusEnum.APPROVED,
          decidedBy: creator.id,
          updatedAt: new Date("2026-05-31T21:30:00Z"),
        },
        {
          groupId: group.id,
          userId: selfAdmitted.id,
          status: GroupJoinRequestStatusEnum.APPROVED,
          decidedBy: selfAdmitted.id,
          updatedAt: now,
        },
        {
          groupId: group.id,
          userId: yesterday.id,
          status: GroupJoinRequestStatusEnum.APPROVED,
          decidedBy: creator.id,
          updatedAt: new Date("2026-05-31T20:30:00Z"),
        },
      ]);

      const organizerView = await groupById(db, {
        groupId: group.id,
        userId: creator.id,
        now,
      });
      expect(organizerView.joinRequestsApprovedToday).toBe(1);

      const memberView = await groupById(db, {
        groupId: group.id,
        userId: approved.id,
        now,
      });
      expect(memberView.joinRequestsApprovedToday).toBe(0);
    } finally {
      await close();
    }
  });
});
