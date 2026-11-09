import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { putS3Object, deleteS3Object } = vi.hoisted(() => ({
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("#src/storage/s3", () => ({
  putS3Object,
  deleteS3Object,
}));

import { storedMediaObject } from "#src/storage/media-urls";
import {
  removeTeamImageObject,
  uploadTeamImageObject,
} from "#src/storage/team-images";

const TEAM_ID = "33333333-3333-4333-8333-333333333333";

describe("uploadTeamImageObject", () => {
  beforeEach(() => {
    putS3Object.mockReset();
    putS3Object.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the object at team-images/{teamId}/image and returns a media path the API signs", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff]);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const url = await uploadTeamImageObject({
      teamId: TEAM_ID,
      bytes,
      contentType: "image/jpeg",
    });

    expect(putS3Object).toHaveBeenCalledWith({
      key: `team-images/${TEAM_ID}/image`,
      body: bytes,
      contentType: "image/jpeg",
    });
    expect(url).toBe(`/api/media/team-images/${TEAM_ID}/image?v=1700000000000`);
    expect(storedMediaObject(url)).toEqual({
      key: `team-images/${TEAM_ID}/image`,
      version: "1700000000000",
    });
  });

  it("does not expose storage errors when Put fails", async () => {
    putS3Object.mockRejectedValue(new Error("AccessDenied: secret-key"));

    await expect(
      uploadTeamImageObject({
        teamId: TEAM_ID,
        bytes: Buffer.from([0xff, 0xd8, 0xff]),
        contentType: "image/jpeg",
      }),
    ).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).toBe("Failed to upload Team image");
      return true;
    });
  });
});

describe("removeTeamImageObject", () => {
  beforeEach(() => {
    deleteS3Object.mockReset();
    deleteS3Object.mockResolvedValue(undefined);
  });

  it("deletes team-images/{teamId}/image", async () => {
    await removeTeamImageObject(TEAM_ID);
    expect(deleteS3Object).toHaveBeenCalledWith(`team-images/${TEAM_ID}/image`);
  });
});
