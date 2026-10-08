import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  groups,
  GroupTypeEnum,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  groupApproverUserIds,
  isGroupApprover,
} from "#src/groups/helpers/is-group-approver";
import { commit } from "#src/soft-archive";

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

async function insertClubGroup(
  database: TestDatabase,
  args: { ownerId: string; creatorId: string },
) {
  const [community] = await database
    .insert(communities)
    .values({ name: "Club", type: "public", createdBy: args.ownerId })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  const [group] = await database
    .insert(groups)
    .values({
      name: "Club Squad",
      createdBy: args.creatorId,
      communityId: community.id,
      type: GroupTypeEnum.PUBLIC,
    })
    .returning();
  if (!group) {
    throw new Error("Failed to insert group");
  }
  return { community, group };
}

async function seat(
  database: TestDatabase,
  communityId: string,
  userId: string,
  role: CommunityRoleEnum,
) {
  await database.insert(communityMembers).values({ communityId, userId, role });
}

async function expectParity(
  database: TestDatabase,
  group: typeof groups.$inferSelect,
  userIds: string[],
) {
  const approvers = await groupApproverUserIds(database, group);
  expect(new Set(approvers).size).toBe(approvers.length);
  for (const userId of userIds) {
    expect(approvers.includes(userId)).toBe(
      await isGroupApprover(database, group, userId),
    );
  }
  return approvers;
}

describe("groupApproverUserIds", () => {
  it("is the creator alone on a Loose Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "loose-creator@example.com");
      const other = await insertUser(db, "loose-other@example.com");
      const [group] = await db
        .insert(groups)
        .values({ name: "Loose", createdBy: creator })
        .returning();
      if (!group) {
        throw new Error("Failed to insert group");
      }

      const approvers = await expectParity(db, group, [creator, other]);
      expect(approvers).toEqual([creator]);
    } finally {
      await close();
    }
  });

  it("is Owners, Admins and a creator who still holds a seat on a Club Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-owner@example.com");
      const admin = await insertUser(db, "club-admin@example.com");
      const creator = await insertUser(db, "club-creator@example.com");
      const member = await insertUser(db, "club-member@example.com");
      const outsider = await insertUser(db, "club-outsider@example.com");
      const { community, group } = await insertClubGroup(db, {
        ownerId: owner,
        creatorId: creator,
      });
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);
      await seat(db, community.id, admin, CommunityRoleEnum.ADMIN);
      await seat(db, community.id, creator, CommunityRoleEnum.MEMBER);
      await seat(db, community.id, member, CommunityRoleEnum.MEMBER);

      const approvers = await expectParity(db, group, [
        owner,
        admin,
        creator,
        member,
        outsider,
      ]);
      expect([...approvers].sort()).toEqual([owner, admin, creator].sort());
    } finally {
      await close();
    }
  });

  it("dedupes an Owner who is also the creator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "dual-owner@example.com");
      const { community, group } = await insertClubGroup(db, {
        ownerId: owner,
        creatorId: owner,
      });
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);

      expect(await expectParity(db, group, [owner])).toEqual([owner]);
    } finally {
      await close();
    }
  });

  it("drops a creator who left the Community (E1)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "left-owner@example.com");
      const creator = await insertUser(db, "left-creator@example.com");
      const { community, group } = await insertClubGroup(db, {
        ownerId: owner,
        creatorId: creator,
      });
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);
      await seat(db, community.id, creator, CommunityRoleEnum.MEMBER);
      await db
        .delete(communityMembers)
        .where(eq(communityMembers.userId, creator));

      const approvers = await expectParity(db, group, [owner, creator]);
      expect(approvers).toEqual([owner]);
    } finally {
      await close();
    }
  });

  it("follows a demoted Admin (E4)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "demote-owner@example.com");
      const admin = await insertUser(db, "demote-admin@example.com");
      const { community, group } = await insertClubGroup(db, {
        ownerId: owner,
        creatorId: owner,
      });
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);
      await seat(db, community.id, admin, CommunityRoleEnum.ADMIN);
      expect(await expectParity(db, group, [owner, admin])).toContain(admin);

      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.MEMBER })
        .where(eq(communityMembers.userId, admin));

      expect(await expectParity(db, group, [owner, admin])).toEqual([owner]);
    } finally {
      await close();
    }
  });

  it("is empty while the Community is Soft-archived (E2)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "arch-owner@example.com");
      const creator = await insertUser(db, "arch-creator@example.com");
      const { community, group } = await insertClubGroup(db, {
        ownerId: owner,
        creatorId: creator,
      });
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);
      await seat(db, community.id, creator, CommunityRoleEnum.MEMBER);
      await commit(db, { communityId: community.id }, "archived");

      expect(await expectParity(db, group, [owner, creator])).toEqual([]);
    } finally {
      await close();
    }
  });
});
