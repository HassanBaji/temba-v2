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

import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { uploadImage } from "#src/routers/groups/uploadImage";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const uploadGroupImageObject = vi.fn();

vi.mock("#src/storage/group-images", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("#src/storage/group-images")>();
  return {
    ...actual,
    uploadGroupImageObject: (
      ...args: Parameters<typeof actual.uploadGroupImageObject>
    ) => uploadGroupImageObject(...args),
  };
});

const JPEG_BYTES = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const MEDIA_URL =
  "/api/media/group-images/11111111-1111-4111-8111-111111111111/image?v=1700000000000";

function jpegBase64(): string {
  return Buffer.from(JPEG_BYTES).toString("base64");
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

describe("uploadImage", () => {
  beforeEach(() => {
    uploadGroupImageObject.mockReset();
    uploadGroupImageObject.mockResolvedValue(MEDIA_URL);
  });

  it("creates Loose Groups with a null imageUrl, kept through a Venue link, when no file is uploaded", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "create-skip@example.com");
      const venue = await insertVenue(db);
      const created = await Promise.all([
        createLoosePublic(db, {
          name: "Loose Public",
          sport: "padel",
          userId: creator.id,
        }),
        createLoosePrivate(db, {
          name: "Loose Private",
          sport: "padel",
          userId: creator.id,
        }),
      ]);
      await db
        .update(groups)
        .set({ venueId: venue.id })
        .where(eq(groups.id, created[1].id));
      for (const group of created) {
        const row = await db.query.groups.findFirst({
          where: eq(groups.id, group.id),
        });
        expect(row?.imageUrl).toBeNull();
      }
      expect(uploadGroupImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("persists the App media URL after a Group approver upload", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "upload-creator@example.com");
      const group = await createLoosePublic(db, {
        name: "With Picture",
        sport: "padel",
        userId: creator.id,
      });

      const updated = await uploadImage(db, {
        groupId: group.id,
        contentType: "image/jpeg",
        dataBase64: jpegBase64(),
        userId: creator.id,
      });

      expect(updated).toEqual({ id: group.id, imageUrl: MEDIA_URL });
      expect(uploadGroupImageObject).toHaveBeenCalledTimes(1);
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.imageUrl).toBe(MEDIA_URL);
    } finally {
      await close();
    }
  });

  it("is FORBIDDEN for a member who is not a Group approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "upload-owner@example.com");
      const member = await insertUser(db, "upload-member@example.com");
      const group = await createLoosePublic(db, {
        name: "Crew",
        sport: "padel",
        userId: creator.id,
      });
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: member.id,
      });

      await expect(
        uploadImage(db, {
          groupId: group.id,
          contentType: "image/jpeg",
          dataBase64: jpegBase64(),
          userId: member.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN", "Only a Group approver can do that");
        return true;
      });
      expect(uploadGroupImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("is BAD_REQUEST for empty, oversized, or wrong magic bytes before Storage", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "upload-invalid@example.com");
      const group = await createLoosePublic(db, {
        name: "Invalid",
        sport: "padel",
        userId: creator.id,
      });

      await expect(
        uploadImage(db, {
          groupId: group.id,
          contentType: "image/jpeg",
          dataBase64: "",
          userId: creator.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "BAD_REQUEST", "Image file is empty");
        return true;
      });

      const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 0xff);
      oversized.set(JPEG_BYTES.subarray(0, 3), 0);
      await expect(
        uploadImage(db, {
          groupId: group.id,
          contentType: "image/jpeg",
          dataBase64: oversized.toString("base64"),
          userId: creator.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "BAD_REQUEST", "Image must be at most 2 MB");
        return true;
      });

      await expect(
        uploadImage(db, {
          groupId: group.id,
          contentType: "image/jpeg",
          dataBase64: Buffer.from("not-an-image").toString("base64"),
          userId: creator.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Image must be a JPEG, PNG, or WebP image",
        );
        return true;
      });

      expect(uploadGroupImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("lets an Appointed Organizer upload on a Club Group, even when its Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "upload-club-creator@example.com");
      const organizer = await insertUser(
        db,
        "upload-club-organizer@example.com",
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
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, venue.id));

      const updated = await uploadImage(db, {
        groupId: group.id,
        contentType: "image/jpeg",
        dataBase64: jpegBase64(),
        userId: organizer.id,
      });

      expect(updated).toEqual({ id: group.id, imageUrl: MEDIA_URL });
      expect(uploadGroupImageObject).toHaveBeenCalledTimes(1);
    } finally {
      await close();
    }
  });
});
