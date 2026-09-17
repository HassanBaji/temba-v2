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

import { createClubPrivate } from "~/server/api/routers/groups/createClubPrivate";
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { createLoosePrivate } from "~/server/api/routers/groups/createLoosePrivate";
import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { uploadImage } from "~/server/api/routers/groups/uploadImage";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const uploadGroupImageObject = vi.fn();

vi.mock("~/server/storage/group-images", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/server/storage/group-images")>();
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
const PUBLIC_URL =
  "https://example.supabase.co/storage/v1/object/public/group-images/group/image";

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

describe("uploadImage", () => {
  beforeEach(() => {
    uploadGroupImageObject.mockReset();
    uploadGroupImageObject.mockResolvedValue(PUBLIC_URL);
  });

  it("creates Loose and Club Groups with a null imageUrl when no file is uploaded", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "create-skip@example.com");
      const owner = await insertUser(db, "create-skip-owner@example.com");
      const community = await insertCommunity(db, {
        ownerId: owner.id,
        name: "Skip Club",
      });
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
        createClubPublic(db, {
          communityId: community.id,
          name: "Club Public",
          sport: "padel",
          userId: owner.id,
        }),
        createClubPrivate(db, {
          communityId: community.id,
          name: "Club Private",
          sport: "padel",
          userId: owner.id,
        }),
      ]);
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

  it("persists the public URL after a Group approver upload", async () => {
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

      expect(updated).toEqual({ id: group.id, imageUrl: PUBLIC_URL });
      expect(uploadGroupImageObject).toHaveBeenCalledTimes(1);
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.imageUrl).toBe(PUBLIC_URL);
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

  it("refuses upload on a Club Group whose Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "upload-frozen-owner@example.com");
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
      await commit(db, { communityId: community.id }, "archived");

      await expect(
        uploadImage(db, {
          groupId: group.id,
          contentType: "image/jpeg",
          dataBase64: jpegBase64(),
          userId: owner.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Cannot upload a Group image while the Community is archived",
        );
        return true;
      });
      expect(uploadGroupImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
