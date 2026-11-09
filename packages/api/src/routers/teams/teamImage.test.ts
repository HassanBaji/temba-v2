import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { teamMembers, teams, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { teamById } from "./byId";
import { clearImage } from "./clearImage";
import { createTeam } from "./create";
import { mine } from "./mine";
import { uploadImage } from "./uploadImage";

const { uploadTeamImageObject, removeTeamImageObject } = vi.hoisted(() => ({
  uploadTeamImageObject: vi.fn(),
  removeTeamImageObject: vi.fn(),
}));

vi.mock("#src/storage/team-images", () => ({
  uploadTeamImageObject,
  removeTeamImageObject,
}));

const JPEG_BYTES = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const MEDIA_URL =
  "/api/media/team-images/11111111-1111-4111-8111-111111111111/image?v=1700000000000";

function jpegBase64() {
  return Buffer.from(JPEG_BYTES).toString("base64");
}

function expectTrpc(error: unknown, code: TRPCError["code"], message: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (error instanceof TRPCError) {
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  }
  return true;
}

async function setup(database: TestDatabase) {
  const [captain, teammate] = await database
    .insert(user)
    .values([
      { name: "Captain", email: "team-image-captain@example.com" },
      { name: "Teammate", email: "team-image-teammate@example.com" },
    ])
    .returning({ id: user.id });
  const team = await createTeam(database, {
    name: "Crest",
    sport: "padel",
    userId: captain!.id,
    userName: "Captain",
  });
  await database
    .insert(teamMembers)
    .values({ teamId: team.id, userId: teammate!.id });
  return { captainId: captain!.id, teammateId: teammate!.id, teamId: team.id };
}

describe("Team image", () => {
  beforeEach(() => {
    uploadTeamImageObject.mockReset();
    uploadTeamImageObject.mockResolvedValue(MEDIA_URL);
    removeTeamImageObject.mockReset();
    removeTeamImageObject.mockResolvedValue(undefined);
  });

  it("lets the Captain upload, shows it on the Team home and Teams list, then clear it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { captainId, teamId } = await setup(db);

      const uploaded = await uploadImage(db, {
        teamId,
        contentType: "image/jpeg",
        dataBase64: jpegBase64(),
        userId: captainId,
      });
      expect(uploaded).toEqual({ id: teamId, imageUrl: MEDIA_URL });
      expect(uploadTeamImageObject).toHaveBeenCalledWith(
        expect.objectContaining({ teamId, contentType: "image/jpeg" }),
      );

      const home = await teamById(db, { teamId, userId: captainId });
      expect(home.imageUrl).toBe(MEDIA_URL);
      expect(home.canManageImage).toBe(true);
      const [listed] = await mine(db, { userId: captainId });
      expect(listed?.imageUrl).toBe(MEDIA_URL);

      const cleared = await clearImage(db, { teamId, userId: captainId });
      expect(cleared).toEqual({ id: teamId, imageUrl: null });
      expect(removeTeamImageObject).toHaveBeenCalledWith(teamId);
      const stored = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });
      expect(stored?.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });

  it("is FORBIDDEN for a teammate who is not the Captain", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { teammateId, teamId } = await setup(db);

      const home = await teamById(db, { teamId, userId: teammateId });
      expect(home.canManageImage).toBe(false);

      await expect(
        uploadImage(db, {
          teamId,
          contentType: "image/jpeg",
          dataBase64: jpegBase64(),
          userId: teammateId,
        }),
      ).rejects.toSatisfy((error) =>
        expectTrpc(
          error,
          "FORBIDDEN",
          "Only the Captain can change the Team image",
        ),
      );
      await expect(
        clearImage(db, { teamId, userId: teammateId }),
      ).rejects.toSatisfy((error) =>
        expectTrpc(
          error,
          "FORBIDDEN",
          "Only the Captain can change the Team image",
        ),
      );
      expect(uploadTeamImageObject).not.toHaveBeenCalled();
      expect(removeTeamImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("is BAD_REQUEST for bytes that are not the declared image type, before Storage", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { captainId, teamId } = await setup(db);

      await expect(
        uploadImage(db, {
          teamId,
          contentType: "image/png",
          dataBase64: jpegBase64(),
          userId: captainId,
        }),
      ).rejects.toSatisfy((error) =>
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Image must be a JPEG, PNG, or WebP image",
        ),
      );
      expect(uploadTeamImageObject).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
