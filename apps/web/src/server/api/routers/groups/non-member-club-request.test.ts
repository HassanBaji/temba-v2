import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupJoinRequests,
  groupMembers,
  GroupSportEnum,
  user,
} from "@repo/db/schema";

import { requestJoin as requestCommunityJoin } from "~/server/api/routers/communities/requestJoin";
import { approveJoinRequest } from "~/server/api/routers/groups/approveJoinRequest";
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { joinClubPublic } from "~/server/api/routers/groups/joinClubPublic";
import { listJoinRequests } from "~/server/api/routers/groups/listJoinRequests";
import { rejectJoinRequest } from "~/server/api/routers/groups/rejectJoinRequest";
import { requestJoin } from "~/server/api/routers/groups/requestJoin";
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
  args: { ownerId: string; name: string; type: "public" | "private" },
) {
  const [community] = await database
    .insert(communities)
    .values({
      name: args.name,
      type: args.type,
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

async function expectBothMemberships(
  database: TestDatabase,
  args: { communityId: string; groupId: string; userId: string },
) {
  const communityMembership = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, args.communityId),
      eq(communityMembers.userId, args.userId),
    ),
  });
  expect(communityMembership?.role).toBe(CommunityRoleEnum.MEMBER);
  const groupMembership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, args.groupId),
      eq(groupMembers.userId, args.userId),
    ),
  });
  expect(groupMembership).toBeTruthy();
}

describe("Club Group Public requests from non-Members", () => {
  it("admits a non-Member to Community Public and the Group when Require approval is off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "public-owner@example.com");
      const outsider = await insertUser(db, "public-outsider@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Open Club",
        type: "public",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Open Squad",
        sport: "padel",
        userId: owner.id,
      });

      await expect(
        joinClubPublic(db, { groupId: group.id, userId: outsider.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "FORBIDDEN",
          "You must be a Community member to join its Club Groups",
        );
        return true;
      });

      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
      });
      expect(pending.status).toBe("pending");

      const listed = await listJoinRequests(db, {
        groupId: group.id,
        userId: owner.id,
      });
      expect(listed).toEqual([
        expect.objectContaining({
          id: pending.id,
          isCommunityMember: false,
          user: expect.objectContaining({ name: outsider.name }),
        }),
      ]);

      await approveJoinRequest(db, {
        requestId: pending.id,
        userId: owner.id,
      });
      await expectBothMemberships(db, {
        communityId: community.id,
        groupId: group.id,
        userId: outsider.id,
      });
    } finally {
      await close();
    }
  });

  it("admits a non-Member through Community Private and still refuses communities.requestJoin", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "private-owner@example.com");
      const outsider = await insertUser(db, "private-outsider@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Hidden Club",
        type: "private",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Hidden Squad",
        sport: "padel",
        userId: owner.id,
      });

      await expect(
        requestCommunityJoin(db, {
          communityId: community.id,
          userId: outsider.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Community Private has no request-to-join path",
        );
        return true;
      });

      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
      });
      await approveJoinRequest(db, {
        requestId: pending.id,
        userId: owner.id,
      });
      await expectBothMemberships(db, {
        communityId: community.id,
        groupId: group.id,
        userId: outsider.id,
      });
    } finally {
      await close();
    }
  });

  it("marks a pending Community join request approved with the Group approver as decidedBy", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "both-owner@example.com");
      const outsider = await insertUser(db, "both-outsider@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Both Club",
        type: "public",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Both Squad",
        sport: "padel",
        userId: owner.id,
      });

      const communityRequest = await requestCommunityJoin(db, {
        communityId: community.id,
        userId: outsider.id,
      });
      const groupRequest = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
      });
      await approveJoinRequest(db, {
        requestId: groupRequest.id,
        userId: owner.id,
      });

      const communityRow = await db.query.communityJoinRequests.findFirst({
        where: eq(communityJoinRequests.id, communityRequest.id),
      });
      expect(communityRow?.status).toBe(
        CommunityJoinRequestStatusEnum.APPROVED,
      );
      expect(communityRow?.decidedBy).toBe(owner.id);
    } finally {
      await close();
    }
  });

  it("adds only the Group membership when the requester is already a Community Member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "later-owner@example.com");
      const outsider = await insertUser(db, "later-outsider@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Later Club",
        type: "public",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Later Squad",
        sport: "padel",
        userId: owner.id,
      });

      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
      });
      await db.insert(communityMembers).values({
        communityId: community.id,
        userId: outsider.id,
        role: CommunityRoleEnum.MEMBER,
      });

      await approveJoinRequest(db, {
        requestId: pending.id,
        userId: owner.id,
      });

      const communityRows = await db.query.communityMembers.findMany({
        where: and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, outsider.id),
        ),
      });
      expect(communityRows).toHaveLength(1);
      expect(
        await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, outsider.id),
          ),
        }),
      ).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("refuses requestJoin and approve while the Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "archive-owner@example.com");
      const outsider = await insertUser(db, "archive-outsider@example.com");
      const later = await insertUser(db, "archive-later@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Frozen Club",
        type: "public",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Frozen Squad",
        sport: "padel",
        userId: owner.id,
      });
      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
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
    } finally {
      await close();
    }
  });

  it("creates no memberships when the Group join request is rejected", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "reject-owner@example.com");
      const outsider = await insertUser(db, "reject-outsider@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Reject Club",
        type: "public",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Reject Squad",
        sport: "padel",
        userId: owner.id,
      });
      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: outsider.id,
      });
      await rejectJoinRequest(db, {
        requestId: pending.id,
        userId: owner.id,
      });

      expect(
        await db.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.userId, outsider.id),
          ),
        }),
      ).toBeUndefined();
      expect(
        await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, outsider.id),
          ),
        }),
      ).toBeUndefined();
      expect(
        await db.query.groupJoinRequests.findFirst({
          where: eq(groupJoinRequests.id, pending.id),
        }),
      ).toMatchObject({ status: "rejected" });
    } finally {
      await close();
    }
  });
});
