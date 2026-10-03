import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GroupTypeEnum,
  communities,
  communityMembers,
  groupMembers,
  groups,
  user,
} from "@repo/db/schema";

import { communityById } from "~/server/api/routers/communities/byId";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertCommunity(
  database: TestDatabase,
  args: {
    createdBy: string;
    members: { userId: string; role: CommunityRoleEnum }[];
  },
) {
  const [row] = await database
    .insert(communities)
    .values({ name: "Riverside", type: "public", createdBy: args.createdBy })
    .returning({ id: communities.id });
  if (!row) {
    throw new Error("Failed to insert community");
  }
  for (const member of args.members) {
    await database.insert(communityMembers).values({
      communityId: row.id,
      userId: member.userId,
      role: member.role,
    });
  }
  return row;
}

async function insertClubGroup(
  database: TestDatabase,
  args: {
    name: string;
    communityId: string;
    createdBy: string;
    imageUrl?: string;
    memberIds: string[];
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      communityId: args.communityId,
      createdBy: args.createdBy,
      type: GroupTypeEnum.PUBLIC,
      imageUrl: args.imageUrl ?? null,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of args.memberIds) {
    await database.insert(groupMembers).values({ groupId: row.id, userId });
  }
  return row;
}

async function seedCommunity(database: TestDatabase) {
  const owner = await insertUser(database, "cb-owner@example.com");
  const admin = await insertUser(database, "cb-admin@example.com");
  const member = await insertUser(database, "cb-member@example.com");
  const community = await insertCommunity(database, {
    createdBy: owner.id,
    members: [
      { userId: owner.id, role: CommunityRoleEnum.OWNER },
      { userId: admin.id, role: CommunityRoleEnum.ADMIN },
      { userId: member.id, role: CommunityRoleEnum.MEMBER },
    ],
  });
  const busy = await insertClubGroup(database, {
    name: "A Busy Crew",
    communityId: community.id,
    createdBy: owner.id,
    imageUrl: "https://cdn.example.com/groups/busy.png",
    memberIds: [owner.id, admin.id],
  });
  const empty = await insertClubGroup(database, {
    name: "B Empty Crew",
    communityId: community.id,
    createdBy: owner.id,
    memberIds: [],
  });
  return { owner, community, busy, empty };
}

describe("communities.byId home facts", () => {
  it("returns the Community member count and each Club Group's count and image", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, community, busy, empty } = await seedCommunity(db);

      const detail = await communityById(db, {
        communityId: community.id,
        userId: owner.id,
      });

      expect(detail.memberCount).toBe(3);
      expect(detail.groups.map((group) => group.id)).toEqual([
        busy.id,
        empty.id,
      ]);
      expect(detail.groups[0]).toMatchObject({
        memberCount: 2,
        imageUrl: "https://cdn.example.com/groups/busy.png",
        isMember: true,
      });
      expect(detail.groups[1]).toMatchObject({
        memberCount: 0,
        imageUrl: null,
        isMember: false,
      });
    } finally {
      await close();
    }
  });

  it("returns the member count to a non-member of a Community Public", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { community, busy, empty } = await seedCommunity(db);
      const outsider = await insertUser(db, "cb-outsider@example.com");

      const detail = await communityById(db, {
        communityId: community.id,
        userId: outsider.id,
      });

      expect(detail.membership).toBeNull();
      expect(detail.memberCount).toBe(3);
      expect(
        detail.groups.map((group) => ({
          id: group.id,
          memberCount: group.memberCount,
          isMember: group.isMember,
        })),
      ).toEqual([
        { id: busy.id, memberCount: 2, isMember: false },
        { id: empty.id, memberCount: 0, isMember: false },
      ]);
    } finally {
      await close();
    }
  });
});
