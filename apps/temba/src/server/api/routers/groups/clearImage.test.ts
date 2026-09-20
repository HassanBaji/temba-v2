import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupMembers,
  groups,
  GroupSportEnum,
  user,
} from "@repo/db/schema";

import { clearImage } from "~/server/api/routers/groups/clearImage";
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const removeGroupImageObject = vi.fn();

vi.mock("~/server/storage/group-images", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/server/storage/group-images")>();
  return {
    ...actual,
    removeGroupImageObject: (
      ...args: Parameters<typeof actual.removeGroupImageObject>
    ) => removeGroupImageObject(...args),
  };
});

const STORED_URL =
  "/api/media/group-images/11111111-1111-4111-8111-111111111111/image?v=1700000000000";

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

async function setImageUrl(
  database: TestDatabase,
  groupId: string,
  imageUrl: string,
) {
  await database.update(groups).set({ imageUrl }).where(eq(groups.id, groupId));
}

describe("clearImage", () => {
  beforeEach(() => {
    removeGroupImageObject.mockReset();
    removeGroupImageObject.mockResolvedValue(undefined);
  });

  it("nulls the image URL after a Group approver removes the Storage object", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "clear-creator@example.com");
      const group = await createLoosePublic(db, {
        name: "With Picture",
        sport: "padel",
        userId: creator.id,
      });
      await setImageUrl(db, group.id, STORED_URL);

      const updated = await clearImage(db, {
        groupId: group.id,
        userId: creator.id,
      });

      expect(updated).toEqual({ id: group.id, imageUrl: null });
      expect(removeGroupImageObject).toHaveBeenCalledTimes(1);
      expect(removeGroupImageObject).toHaveBeenCalledWith(group.id);
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });

  it("is FORBIDDEN for a member who is not a Group approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "clear-owner@example.com");
      const member = await insertUser(db, "clear-member@example.com");
      const group = await createLoosePublic(db, {
        name: "Crew",
        sport: "padel",
        userId: creator.id,
      });
      await setImageUrl(db, group.id, STORED_URL);
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: member.id,
      });

      await expect(
        clearImage(db, {
          groupId: group.id,
          userId: member.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN", "Only a Group approver can do that");
        return true;
      });
      expect(removeGroupImageObject).not.toHaveBeenCalled();
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.imageUrl).toBe(STORED_URL);
    } finally {
      await close();
    }
  });

  it("refuses clear on a Club Group whose Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "clear-frozen-owner@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Frozen Club",
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Frozen Crew",
        sport: "padel",
        userId: owner.id,
      });
      await setImageUrl(db, group.id, STORED_URL);
      await commit(db, { communityId: community.id }, "archived");

      await expect(
        clearImage(db, {
          groupId: group.id,
          userId: owner.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Cannot clear a Group image while the Community is archived",
        );
        return true;
      });
      expect(removeGroupImageObject).not.toHaveBeenCalled();
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.imageUrl).toBe(STORED_URL);
    } finally {
      await close();
    }
  });
});
