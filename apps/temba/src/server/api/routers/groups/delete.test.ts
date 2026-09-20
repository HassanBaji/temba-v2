import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { groups, user } from "@repo/db/schema";

import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { deleteGroup } from "~/server/api/routers/groups/delete";
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

describe("deleteGroup image cleanup", () => {
  beforeEach(() => {
    removeGroupImageObject.mockReset();
    removeGroupImageObject.mockRejectedValue(new Error("storage down"));
  });

  it("still deletes the Group when Storage remove fails", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "delete-image@example.com");
      const group = await createLoosePublic(db, {
        name: "Empty Crew",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({
          imageUrl:
            "https://example.supabase.co/storage/v1/object/public/group-images/x/image",
        })
        .where(eq(groups.id, group.id));

      const result = await deleteGroup(db, {
        groupId: group.id,
        userId: creator.id,
      });

      expect(result).toEqual({
        ok: true,
        groupId: group.id,
        communityId: null,
      });
      expect(removeGroupImageObject).toHaveBeenCalledWith(group.id);
      const remaining = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(remaining).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("does not call Storage when the Group has no image", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "delete-no-image@example.com");
      const group = await createLoosePublic(db, {
        name: "Plain Crew",
        sport: "padel",
        userId: creator.id,
      });

      await deleteGroup(db, {
        groupId: group.id,
        userId: creator.id,
      });

      expect(removeGroupImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});

describe("deleteGroup", () => {
  it("still refuses a non-creator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "delete-creator@example.com");
      const other = await insertUser(db, "delete-other@example.com");
      const group = await createLoosePublic(db, {
        name: "Stay",
        sport: "padel",
        userId: creator.id,
      });

      await expect(
        deleteGroup(db, { groupId: group.id, userId: other.id }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });
});
