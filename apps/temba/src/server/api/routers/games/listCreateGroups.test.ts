import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  groups,
  user,
} from "@repo/db/schema";

import { listCreateGroups } from "~/server/api/routers/games/listCreateGroups";
import { commit } from "~/server/soft-archive";
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

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; name: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      communityId: args.communityId,
    })
    .returning({ id: groups.id, name: groups.name });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

describe("listCreateGroups", () => {
  it("returns Groups the caller may organize, sorted by name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "list-create-owner@example.com");
      const other = await insertUser(db, "list-create-other@example.com");
      const zebra = await insertGroup(db, {
        createdBy: owner.id,
        name: "Zebra",
      });
      const alpha = await insertGroup(db, {
        createdBy: owner.id,
        name: "Alpha",
      });
      await insertGroup(db, { createdBy: other.id, name: "Other Crew" });

      const rows = await listCreateGroups(db, { userId: owner.id });
      expect(rows.map((row) => row.id)).toEqual([alpha.id, zebra.id]);
      expect(rows[0]?.communityName).toBeNull();
    } finally {
      await close();
    }
  });

  it("includes Club Groups the caller staffs even when they did not create them", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "list-create-staff@example.com");
      const creator = await insertUser(db, "list-create-creator@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Live Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id, name: communities.name });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await db.insert(communityMembers).values({
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      const clubGroup = await insertGroup(db, {
        createdBy: creator.id,
        name: "Club Squad",
        communityId: community.id,
      });

      const rows = await listCreateGroups(db, { userId: owner.id });
      expect(rows).toEqual([
        {
          id: clubGroup.id,
          name: "Club Squad",
          communityName: "Live Club",
        },
      ]);
    } finally {
      await close();
    }
  });

  it("excludes Groups the caller may not organize and Club Groups in Soft-archived Communities", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "list-create-archive@example.com");
      const member = await insertUser(db, "list-create-member@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Archived Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await db.insert(communityMembers).values([
        {
          communityId: community.id,
          userId: owner.id,
          role: CommunityRoleEnum.OWNER,
        },
        {
          communityId: community.id,
          userId: member.id,
          role: CommunityRoleEnum.MEMBER,
        },
      ]);
      const clubGroup = await insertGroup(db, {
        createdBy: owner.id,
        name: "Hidden Club Group",
        communityId: community.id,
      });
      await commit(db, { communityId: community.id }, "archived");

      const ownerRows = await listCreateGroups(db, { userId: owner.id });
      expect(ownerRows.map((row) => row.id)).not.toContain(clubGroup.id);

      const memberRows = await listCreateGroups(db, { userId: member.id });
      expect(memberRows).toEqual([]);
    } finally {
      await close();
    }
  });
});
