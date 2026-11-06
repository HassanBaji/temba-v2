import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import { clearImage } from "#src/routers/groups/clearImage";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const removeGroupImageObject = vi.fn();

vi.mock("#src/storage/group-images", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("#src/storage/group-images")>();
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

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({ name: "Padel Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
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

  it("lets an Appointed Organizer clear the image on a Club Group, even when its Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "clear-club-creator@example.com");
      const organizer = await insertUser(
        db,
        "clear-club-organizer@example.com",
      );
      const venue = await insertVenue(db);
      const group = await createLoosePublic(db, {
        name: "Club Crew",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({ venueId: venue.id })
        .where(eq(groups.id, group.id));
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: organizer.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      });
      await setImageUrl(db, group.id, STORED_URL);
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, venue.id));

      const updated = await clearImage(db, {
        groupId: group.id,
        userId: organizer.id,
      });

      expect(updated).toEqual({ id: group.id, imageUrl: null });
      expect(removeGroupImageObject).toHaveBeenCalledWith(group.id);
    } finally {
      await close();
    }
  });
});
