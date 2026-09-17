import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupMembers,
  groups,
  GroupSportEnum,
  GroupTypeEnum,
  user,
} from "@repo/db/schema";

import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { createLoosePrivate } from "~/server/api/routers/groups/createLoosePrivate";
import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { joinLoosePublic } from "~/server/api/routers/groups/joinLoosePublic";
import { listPublic } from "~/server/api/routers/groups/listPublic";
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

describe("listPublic", () => {
  it("lists live Public padel Groups the viewer is not in, with joinMode", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "list-viewer@example.com");
      const creator = await insertUser(db, "list-creator@example.com");
      const owner = await insertUser(db, "list-owner@example.com");
      const member = await insertUser(db, "list-member@example.com");

      const looseOpen = await createLoosePublic(db, {
        name: "Zebra Open",
        sport: "padel",
        userId: creator.id,
      });
      const looseGated = await createLoosePublic(db, {
        name: "Alpha Gated",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });
      const mine = await createLoosePublic(db, {
        name: "Mine Crew",
        sport: "padel",
        userId: viewer.id,
      });
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Crew",
        sport: "padel",
        userId: creator.id,
      });
      const [football] = await db
        .insert(groups)
        .values({
          name: "Football Public",
          createdBy: creator.id,
          type: GroupTypeEnum.PUBLIC,
          sport: GroupSportEnum.FOOTBALL,
        })
        .returning({ id: groups.id });
      if (!football) {
        throw new Error("Failed to insert football Group");
      }

      const publicCommunity = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Open Club",
        type: "public",
      });
      const privateCommunity = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Hidden Club",
        type: "private",
      });
      const archivedCommunity = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Archived Club",
        type: "public",
      });
      await db.insert(communityMembers).values({
        communityId: publicCommunity.id,
        userId: member.id,
        role: CommunityRoleEnum.MEMBER,
      });

      const clubOpen = await createClubPublic(db, {
        communityId: publicCommunity.id,
        name: "Club Open",
        sport: "padel",
        userId: owner.id,
      });
      const clubPrivateCommunity = await createClubPublic(db, {
        communityId: privateCommunity.id,
        name: "Club From Private",
        sport: "padel",
        userId: owner.id,
      });
      const clubArchived = await createClubPublic(db, {
        communityId: archivedCommunity.id,
        name: "Club Archived",
        sport: "padel",
        userId: owner.id,
      });
      await commit(db, { communityId: archivedCommunity.id }, "archived");

      await db.insert(groupMembers).values({
        groupId: looseOpen.id,
        userId: member.id,
      });

      const viewerRows = await listPublic(db, { userId: viewer.id });
      expect(viewerRows.map((row) => row.id).sort()).toEqual(
        [
          looseOpen.id,
          looseGated.id,
          clubOpen.id,
          clubPrivateCommunity.id,
        ].sort(),
      );
      expect(viewerRows.map((row) => row.id)).not.toContain(mine.id);
      expect(viewerRows.map((row) => row.id)).not.toContain(privateGroup.id);
      expect(viewerRows.map((row) => row.id)).not.toContain(football.id);
      expect(viewerRows.map((row) => row.id)).not.toContain(clubArchived.id);

      const byId = new Map(viewerRows.map((row) => [row.id, row]));
      expect(byId.get(looseOpen.id)?.joinMode).toBe("join");
      expect(byId.get(looseGated.id)?.joinMode).toBe("request");
      expect(byId.get(clubOpen.id)?.joinMode).toBe("request");
      expect(byId.get(clubOpen.id)?.communityName).toBe("Open Club");
      expect(byId.get(clubPrivateCommunity.id)?.communityName).toBe(
        "Hidden Club",
      );
      expect(byId.get(looseOpen.id)?.memberCount).toBe(2);

      const memberRows = await listPublic(db, { userId: member.id });
      const memberById = new Map(memberRows.map((row) => [row.id, row]));
      expect(memberById.get(clubOpen.id)?.joinMode).toBe("join");
      expect(memberById.has(looseOpen.id)).toBe(false);

      await requestJoin(db, {
        groupId: looseGated.id,
        userId: viewer.id,
      });
      const afterRequest = await listPublic(db, { userId: viewer.id });
      expect(
        afterRequest.find((row) => row.id === looseGated.id)?.joinMode,
      ).toBe("requested");

      await joinLoosePublic(db, {
        groupId: looseOpen.id,
        userId: viewer.id,
      });
      const afterJoin = await listPublic(db, { userId: viewer.id });
      expect(afterJoin.map((row) => row.id)).not.toContain(looseOpen.id);

      const created = await createLoosePublic(db, {
        name: "Brand New",
        sport: "padel",
        userId: creator.id,
      });
      const afterCreate = await listPublic(db, { userId: viewer.id });
      expect(afterCreate.map((row) => row.id)).toContain(created.id);
    } finally {
      await close();
    }
  });

  it("orders by member count desc, then name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "order-viewer@example.com");
      const creator = await insertUser(db, "order-creator@example.com");
      const extra = await insertUser(db, "order-extra@example.com");
      const beta = await createLoosePublic(db, {
        name: "Beta",
        sport: "padel",
        userId: creator.id,
      });
      const alpha = await createLoosePublic(db, {
        name: "Alpha",
        sport: "padel",
        userId: creator.id,
      });
      const crowded = await createLoosePublic(db, {
        name: "Crowded",
        sport: "padel",
        userId: creator.id,
      });
      await db.insert(groupMembers).values({
        groupId: crowded.id,
        userId: extra.id,
      });

      const rows = await listPublic(db, { userId: viewer.id });
      expect(rows.map((row) => row.id)).toEqual([
        crowded.id,
        alpha.id,
        beta.id,
      ]);
    } finally {
      await close();
    }
  });

  it("returns a stored imageUrl when the column is set, and null otherwise", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "public-image-viewer@example.com");
      const creator = await insertUser(db, "public-image-creator@example.com");
      const pictured = await createLoosePublic(db, {
        name: "Pictured Public",
        sport: "padel",
        userId: creator.id,
      });
      const plain = await createLoosePublic(db, {
        name: "Plain Public",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({
          imageUrl:
            "https://example.supabase.co/storage/v1/object/public/group-images/public/image",
        })
        .where(eq(groups.id, pictured.id));

      const rows = await listPublic(db, { userId: viewer.id });
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(pictured.id)?.imageUrl).toBe(
        "https://example.supabase.co/storage/v1/object/public/group-images/public/image",
      );
      expect(byId.get(plain.id)?.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });
});
