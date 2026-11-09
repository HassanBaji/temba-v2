import { TRPCError } from "@trpc/server";

import { type GroupImageContentType } from "#src/storage/group-images";
import { deleteS3Object, putS3Object } from "#src/storage/s3";

function teamImageObjectPath(teamId: string): string {
  return `team-images/${teamId}/image`;
}

export async function uploadTeamImageObject(input: {
  teamId: string;
  bytes: Buffer;
  contentType: GroupImageContentType;
}): Promise<string> {
  try {
    await putS3Object({
      key: teamImageObjectPath(input.teamId),
      body: input.bytes,
      contentType: input.contentType,
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload Team image",
    });
  }

  return `/api/media/team-images/${input.teamId}/image?v=${Date.now()}`;
}

export async function removeTeamImageObject(teamId: string): Promise<void> {
  try {
    await deleteS3Object(teamImageObjectPath(teamId));
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Team image",
    });
  }
}
