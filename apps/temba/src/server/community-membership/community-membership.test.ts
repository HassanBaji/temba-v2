import {
  communities,
  communityJoinRequests,
  communityMembers,
  CommunityRoleEnum,
  groupMembers,
  groups,
  teamMembers,
  teams,
  user,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { admit, leave } from "~/server/community-membership";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertCommunity(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(communities)
    .values({
      name: "Membership Club",
      type: "private",
      createdBy,
    })
    .returning({ id: communities.id });
  if (!row) {
    throw new Error("Failed to insert community");
  }
  return row;
}

describe("Community membership", () => {
  it("admits Owner and Member roles", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "membership-owner@example.com");
      const member = await insertUser(db, "membership-member@example.com");
      const community = await insertCommunity(db, owner.id);

      const ownerAdmit = await admit(db, {
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      expect(ownerAdmit).toMatchObject({
        ok: true,
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });

      const memberAdmit = await admit(db, {
        communityId: community.id,
        userId: member.id,
        role: CommunityRoleEnum.MEMBER,
      });
      expect(memberAdmit).toMatchObject({
        ok: true,
        userId: member.id,
        role: CommunityRoleEnum.MEMBER,
      });

      expect(
        await admit(db, {
          communityId: community.id,
          userId: member.id,
          role: CommunityRoleEnum.MEMBER,
        }),
      ).toEqual({ ok: false, reason: "already_member" });

      expect(
        await admit(db, {
          communityId: "00000000-0000-4000-8000-000000000099",
          userId: member.id,
          role: CommunityRoleEnum.MEMBER,
        }),
      ).toEqual({ ok: false, reason: "not_found" });
    } finally {
      await close();
    }
  });

  it("leave strips Club Group seats and stays allowed while Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "leave-owner@example.com");
      const member = await insertUser(db, "leave-member@example.com");
      const community = await insertCommunity(db, owner.id);
      await admit(db, {
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      await admit(db, {
        communityId: community.id,
        userId: member.id,
        role: CommunityRoleEnum.MEMBER,
      });

      const [clubGroup] = await db
        .insert(groups)
        .values({
          name: "Club Group",
          createdBy: owner.id,
          communityId: community.id,
        })
        .returning({ id: groups.id });
      if (!clubGroup) {
        throw new Error("Failed to insert club group");
      }
      await db.insert(groupMembers).values({
        groupId: clubGroup.id,
        userId: member.id,
      });
      await db.insert(communityJoinRequests).values({
        communityId: community.id,
        userId: member.id,
      });

      await commit(db, { communityId: community.id }, "archived");

      const left = await leave(db, {
        communityId: community.id,
        userId: member.id,
      });
      expect(left).toEqual({
        ok: true,
        communityId: community.id,
        userId: member.id,
      });

      const membership = await db.query.communityMembers.findFirst({
        where: eq(communityMembers.userId, member.id),
      });
      expect(membership).toBeUndefined();
      const groupSeat = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.userId, member.id),
      });
      expect(groupSeat).toBeUndefined();
      const joinRequests = await db.query.communityJoinRequests.findMany({
        where: eq(communityJoinRequests.userId, member.id),
      });
      expect(joinRequests).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("refuses leave on a linked Team seat and last Owner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "refuse-owner@example.com");
      const partner = await insertUser(db, "refuse-partner@example.com");
      const community = await insertCommunity(db, owner.id);
      await admit(db, {
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      await admit(db, {
        communityId: community.id,
        userId: partner.id,
        role: CommunityRoleEnum.MEMBER,
      });

      expect(
        await leave(db, { communityId: community.id, userId: owner.id }),
      ).toEqual({ ok: false, reason: "last_owner" });

      const [team] = await db
        .insert(teams)
        .values({
          name: "Linked",
          createdBy: partner.id,
          communityId: community.id,
        })
        .returning({ id: teams.id });
      if (!team) {
        throw new Error("Failed to insert team");
      }
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: partner.id,
      });

      expect(
        await leave(db, { communityId: community.id, userId: partner.id }),
      ).toEqual({ ok: false, reason: "linked_team_seat" });

      expect(
        await leave(db, {
          communityId: community.id,
          userId: "00000000-0000-4000-8000-000000000098",
        }),
      ).toEqual({ ok: false, reason: "not_a_member" });
    } finally {
      await close();
    }
  });
});
