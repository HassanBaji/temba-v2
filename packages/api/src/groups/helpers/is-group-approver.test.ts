import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  groups,
  GroupTypeEnum,
  user,
} from "@repo/db/schema";

import {
  groupApproverUserIds,
  isGroupApprover,
} from "#src/groups/helpers/is-group-approver";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Parity Group",
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      communityId: args.communityId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertCommunity(database: TestDatabase, ownerId: string) {
  const [row] = await database
    .insert(communities)
    .values({ name: "Parity Club", type: "public", createdBy: ownerId })
    .returning({ id: communities.id });
  if (!row) {
    throw new Error("Failed to insert community");
  }
  return row.id;
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
  const resolved = await groupApproverUserIds(database, group);
  expect(new Set(resolved).size).toBe(resolved.length);
  for (const userId of userIds) {
    expect(resolved.includes(userId)).toBe(
      await isGroupApprover(database, group, userId),
    );
  }
}

async function clubFixture(database: TestDatabase) {
  const owner = await insertUser(database, "parity-owner@example.com");
  const admin = await insertUser(database, "parity-admin@example.com");
  const member = await insertUser(database, "parity-member@example.com");
  const creator = await insertUser(database, "parity-creator@example.com");
  const outsider = await insertUser(database, "parity-outsider@example.com");
  const communityId = await insertCommunity(database, owner);
  await seat(database, communityId, owner, CommunityRoleEnum.OWNER);
  await seat(database, communityId, admin, CommunityRoleEnum.ADMIN);
  await seat(database, communityId, member, CommunityRoleEnum.MEMBER);
  await seat(database, communityId, creator, CommunityRoleEnum.MEMBER);
  const group = await insertGroup(database, {
    createdBy: creator,
    communityId,
  });
  return {
    communityId,
    group,
    owner,
    admin,
    member,
    creator,
    outsider,
    everyone: [owner, admin, member, creator, outsider],
  };
}

describe("groupApproverUserIds", () => {
  it("is the creator alone on a Loose Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "parity-loose-creator@example.com");
      const other = await insertUser(db, "parity-loose-other@example.com");
      const group = await insertGroup(db, { createdBy: creator });

      expect(await groupApproverUserIds(db, group)).toEqual([creator]);
      await expectParity(db, group, [creator, other]);
    } finally {
      await close();
    }
  });

  it("is Owners, Admins and a creator who still holds a seat on a Club Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);

      expect((await groupApproverUserIds(db, fixture.group)).sort()).toEqual(
        [fixture.owner, fixture.admin, fixture.creator].sort(),
      );
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("lists an Owner who is also the creator once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "parity-owner-creator@example.com");
      const communityId = await insertCommunity(db, owner);
      await seat(db, communityId, owner, CommunityRoleEnum.OWNER);
      const group = await insertGroup(db, { createdBy: owner, communityId });

      expect(await groupApproverUserIds(db, group)).toEqual([owner]);
      await expectParity(db, group, [owner]);
    } finally {
      await close();
    }
  });

  it("drops a Club Group creator who left the Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);
      await db
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, fixture.communityId),
            eq(communityMembers.userId, fixture.creator),
          ),
        );

      expect(await groupApproverUserIds(db, fixture.group)).not.toContain(
        fixture.creator,
      );
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("drops a demoted Admin", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);
      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.MEMBER })
        .where(eq(communityMembers.userId, fixture.admin));

      expect(await groupApproverUserIds(db, fixture.group)).not.toContain(
        fixture.admin,
      );
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("is nobody while the Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);
      await commit(db, { communityId: fixture.communityId }, "archived");

      expect(await groupApproverUserIds(db, fixture.group)).toEqual([]);
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });
});
