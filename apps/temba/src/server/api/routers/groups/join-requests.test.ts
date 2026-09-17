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
  groups,
  GroupSportEnum,
  GroupTypeEnum,
  user,
} from "@repo/db/schema";

import { acceptInviteLink } from "~/server/api/routers/groups/acceptInviteLink";
import { acceptLookupInvite } from "~/server/api/routers/groups/acceptLookupInvite";
import { approveJoinRequest } from "~/server/api/routers/groups/approveJoinRequest";
import { groupById } from "~/server/api/routers/groups/byId";
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { createInviteLink } from "~/server/api/routers/groups/createInviteLink";
import { createLoosePrivate } from "~/server/api/routers/groups/createLoosePrivate";
import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { joinClubPublic } from "~/server/api/routers/groups/joinClubPublic";
import { joinLoosePublic } from "~/server/api/routers/groups/joinLoosePublic";
import { leaveGroup } from "~/server/api/routers/groups/leave";
import { listJoinRequests } from "~/server/api/routers/groups/listJoinRequests";
import { rejectJoinRequest } from "~/server/api/routers/groups/rejectJoinRequest";
import { requestJoin } from "~/server/api/routers/groups/requestJoin";
import { sendLookupInvite } from "~/server/api/routers/groups/sendLookupInvite";
import { setRequiresApproval } from "~/server/api/routers/groups/setRequiresApproval";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

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

async function insertCommunity(
  database: TestDatabase,
  args: { ownerId: string; name: string },
) {
  const [community] = await database
    .insert(communities)
    .values({
      name: args.name,
      type: "public",
      createdBy: args.ownerId,
    })
    .returning({ id: communities.id, name: communities.name });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communitySports).values({
    communityId: community.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values({
    communityId: community.id,
    userId: args.ownerId,
    role: CommunityRoleEnum.OWNER,
  });
  return community;
}

async function memberCount(database: TestDatabase, groupId: string) {
  return database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    columns: { userId: true },
  });
}

function expectTrpc(error: unknown, code: TRPCError["code"], message?: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (!(error instanceof TRPCError)) {
    return;
  }
  expect(error.code).toBe(code);
  if (message) {
    expect(error.message).toBe(message);
  }
}

describe("group join requests", () => {
  it("defaults requires_approval to false on existing Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "default-flag@example.com");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Legacy Crew",
          createdBy: creator.id,
          type: GroupTypeEnum.PUBLIC,
        })
        .returning({
          id: groups.id,
          requiresApproval: groups.requiresApproval,
        });
      expect(group?.requiresApproval).toBe(false);
    } finally {
      await close();
    }
  });

  it("admits via joinLoosePublic when Require approval is off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "join-off-creator@example.com");
      const joiner = await insertUser(db, "join-off-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Open Crew",
        sport: "padel",
        userId: creator.id,
      });

      await joinLoosePublic(db, { groupId: group.id, userId: joiner.id });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId).sort()).toEqual(
        [creator.id, joiner.id].sort(),
      );
    } finally {
      await close();
    }
  });

  it("refuses joinLoosePublic when the flag is on, then the creator can approve", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "join-on-creator@example.com");
      const joiner = await insertUser(db, "join-on-joiner@example.com");
      const stranger = await insertUser(db, "join-on-stranger@example.com");
      const group = await createLoosePublic(db, {
        name: "Gated Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
        columns: { requiresApproval: true },
      });
      expect(stored?.requiresApproval).toBe(true);

      await expect(
        joinLoosePublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "This Group requires approval. Request to join instead.",
        );
        return true;
      });

      const requested = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(requested.status).toBe("pending");

      const again = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(again.id).toBe(requested.id);

      const viewer = await groupById(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(viewer.joinMode).toBe("requested");
      expect(viewer.canJoin).toBe(false);

      const pending = await listJoinRequests(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(pending).toHaveLength(1);
      expect(pending[0]?.user.name).toBe(joiner.name);
      expect(pending[0]?.id).toBe(requested.id);

      await expect(
        listJoinRequests(db, { groupId: group.id, userId: stranger.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });
      await expect(
        approveJoinRequest(db, {
          requestId: requested.id,
          userId: stranger.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });
      await expect(
        rejectJoinRequest(db, {
          requestId: requested.id,
          userId: stranger.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });

      await approveJoinRequest(db, {
        requestId: requested.id,
        userId: creator.id,
      });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId).sort()).toEqual(
        [creator.id, joiner.id].sort(),
      );

      const row = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, requested.id),
      });
      expect(row?.status).toBe(GroupJoinRequestStatusEnum.APPROVED);
      expect(row?.decidedBy).toBe(creator.id);

      const after = await listJoinRequests(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(after).toEqual([]);
    } finally {
      await close();
    }
  });

  it("lets a rejected or departed User request again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "rerequest-creator@example.com");
      const joiner = await insertUser(db, "rerequest-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Rejoin Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const first = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      await rejectJoinRequest(db, {
        requestId: first.id,
        userId: creator.id,
      });

      const membersAfterReject = await memberCount(db, group.id);
      expect(membersAfterReject.map((row) => row.userId)).toEqual([creator.id]);

      const second = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(second.id).toBe(first.id);
      expect(second.status).toBe("pending");

      await approveJoinRequest(db, {
        requestId: second.id,
        userId: creator.id,
      });
      await leaveGroup(db, { groupId: group.id, userId: joiner.id });

      const third = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(third.id).toBe(first.id);
      expect(third.status).toBe("pending");
    } finally {
      await close();
    }
  });

  it("refuses requestJoin when the join mode is join, member, or none", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "mode-creator@example.com");
      const outsider = await insertUser(db, "mode-outsider@example.com");
      const open = await createLoosePublic(db, {
        name: "Open Mode",
        sport: "padel",
        userId: creator.id,
      });
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Mode",
        sport: "padel",
        userId: creator.id,
      });

      await expect(
        requestJoin(db, { groupId: open.id, userId: outsider.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
      await expect(
        requestJoin(db, { groupId: open.id, userId: creator.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
      await expect(
        requestJoin(db, { groupId: privateGroup.id, userId: outsider.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
    } finally {
      await close();
    }
  });

  it("refuses setRequiresApproval on Private Groups and for non-approvers, and turning it off leaves pending", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "flag-creator@example.com");
      const outsider = await insertUser(db, "flag-outsider@example.com");
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Flag",
        sport: "padel",
        userId: creator.id,
      });
      const publicGroup = await createLoosePublic(db, {
        name: "Public Flag",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      await expect(
        setRequiresApproval(db, {
          groupId: privateGroup.id,
          requiresApproval: true,
          userId: creator.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Require approval only applies to Public Groups",
        );
        return true;
      });

      await expect(
        setRequiresApproval(db, {
          groupId: publicGroup.id,
          requiresApproval: false,
          userId: outsider.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });

      const pending = await requestJoin(db, {
        groupId: publicGroup.id,
        userId: outsider.id,
      });
      await setRequiresApproval(db, {
        groupId: publicGroup.id,
        requiresApproval: false,
        userId: creator.id,
      });

      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, publicGroup.id),
        columns: { requiresApproval: true },
      });
      expect(stored?.requiresApproval).toBe(false);

      const stillPending = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, pending.id),
      });
      expect(stillPending?.status).toBe(GroupJoinRequestStatusEnum.PENDING);

      const listed = await listJoinRequests(db, {
        groupId: publicGroup.id,
        userId: creator.id,
      });
      expect(listed.map((row) => row.id)).toEqual([pending.id]);
    } finally {
      await close();
    }
  });

  it("lets Club Public Member requesters be approved by Owner, Admin, or Group creator, and refuses joinClubPublic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-owner@example.com");
      const admin = await insertUser(db, "club-admin@example.com");
      const creator = await insertUser(db, "club-creator@example.com");
      const member = await insertUser(db, "club-member@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Live Club",
      });
      await db.insert(communityMembers).values([
        {
          communityId: community.id,
          userId: admin.id,
          role: CommunityRoleEnum.ADMIN,
        },
        {
          communityId: community.id,
          userId: creator.id,
          role: CommunityRoleEnum.MEMBER,
        },
        {
          communityId: community.id,
          userId: member.id,
          role: CommunityRoleEnum.MEMBER,
        },
      ]);

      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Club Squad",
        sport: "padel",
        userId: owner.id,
        requiresApproval: true,
      });
      await db
        .update(groups)
        .set({ createdBy: creator.id })
        .where(eq(groups.id, group.id));

      await expect(
        joinClubPublic(db, { groupId: group.id, userId: member.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "This Group requires approval. Request to join instead.",
        );
        return true;
      });

      const ownerRequest = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });
      await approveJoinRequest(db, {
        requestId: ownerRequest.id,
        userId: owner.id,
      });
      await leaveGroup(db, { groupId: group.id, userId: member.id });

      const adminRequest = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });
      await approveJoinRequest(db, {
        requestId: adminRequest.id,
        userId: admin.id,
      });
      await leaveGroup(db, { groupId: group.id, userId: member.id });

      const creatorRequest = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });
      await approveJoinRequest(db, {
        requestId: creatorRequest.id,
        userId: creator.id,
      });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId)).toContain(member.id);
    } finally {
      await close();
    }
  });

  it("refuses request, approve, reject, and setRequiresApproval while the Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "archive-owner@example.com");
      const member = await insertUser(db, "archive-member@example.com");
      const later = await insertUser(db, "archive-later@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Archived Club",
      });
      await db.insert(communityMembers).values([
        {
          communityId: community.id,
          userId: member.id,
          role: CommunityRoleEnum.MEMBER,
        },
        {
          communityId: community.id,
          userId: later.id,
          role: CommunityRoleEnum.MEMBER,
        },
      ]);
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Frozen Squad",
        sport: "padel",
        userId: owner.id,
        requiresApproval: true,
      });
      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });

      await commit(db, { communityId: community.id }, "archived");

      await expect(
        requestJoin(db, { groupId: group.id, userId: later.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
      await expect(
        approveJoinRequest(db, {
          requestId: pending.id,
          userId: owner.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Cannot approve join requests while the Community is archived",
        );
        return true;
      });
      await expect(
        rejectJoinRequest(db, {
          requestId: pending.id,
          userId: owner.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Cannot reject join requests while the Community is archived",
        );
        return true;
      });
      await expect(
        setRequiresApproval(db, {
          groupId: group.id,
          requiresApproval: false,
          userId: owner.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Cannot change Require approval while the Community is archived",
        );
        return true;
      });
    } finally {
      await close();
    }
  });

  it("marks a pending Group join request approved after Lookup invite or Invite link accept", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "invite-creator@example.com");
      const lookupUser = await insertUser(db, "invite-lookup@example.com");
      const linkUser = await insertUser(db, "invite-link@example.com");
      const lookupGroup = await createLoosePublic(db, {
        name: "Lookup Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });
      const linkGroup = await createLoosePublic(db, {
        name: "Link Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const lookupRequest = await requestJoin(db, {
        groupId: lookupGroup.id,
        userId: lookupUser.id,
      });
      const sent = await sendLookupInvite(db, {
        groupId: lookupGroup.id,
        userId: creator.id,
        userIds: [lookupUser.id],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Failed to send Lookup invite");
      }
      await acceptLookupInvite(db, {
        inviteId,
        userId: lookupUser.id,
      });
      const lookupRow = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, lookupRequest.id),
      });
      expect(lookupRow?.status).toBe(GroupJoinRequestStatusEnum.APPROVED);
      expect(
        await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, lookupGroup.id),
            eq(groupMembers.userId, lookupUser.id),
          ),
        }),
      ).toBeTruthy();

      const linkRequest = await requestJoin(db, {
        groupId: linkGroup.id,
        userId: linkUser.id,
      });
      await createInviteLink(db, {
        groupId: linkGroup.id,
        userId: creator.id,
        origin: "http://localhost:3000",
      });
      const link = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.groupId, linkGroup.id),
      });
      if (!link) {
        throw new Error("Failed to mint Invite link");
      }
      await acceptInviteLink(db, {
        token: link.token,
        userId: linkUser.id,
      });
      const linkRow = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, linkRequest.id),
      });
      expect(linkRow?.status).toBe(GroupJoinRequestStatusEnum.APPROVED);
    } finally {
      await close();
    }
  });
});
