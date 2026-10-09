import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import {
  assertGroupImageType,
  decodeGroupImageBase64,
  GROUP_IMAGE_CONTENT_TYPES,
  type GroupImageContentType,
  uploadGroupImageObject,
} from "#src/storage/group-images";

type DbClient = typeof db;

export async function uploadImage(
  database: DbClient,
  args: {
    groupId: string;
    contentType: GroupImageContentType;
    dataBase64: string;
    userId: string;
  },
) {
  const group = await requireGroup(database, args.groupId);

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "host", {
      frozenMessage:
        "Cannot upload a Group image while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  const bytes = decodeGroupImageBase64(args.dataBase64);
  const contentType = assertGroupImageType(bytes, args.contentType);
  const imageUrl = await uploadGroupImageObject({
    groupId: args.groupId,
    bytes,
    contentType,
  });

  const [updated] = await database
    .update(groups)
    .set({
      imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, group.id))
    .returning({
      id: groups.id,
      imageUrl: groups.imageUrl,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Group image",
    });
  }

  return updated;
}

export const uploadImageProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      contentType: z.enum(GROUP_IMAGE_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return uploadImage(ctx.db, {
      groupId: input.groupId,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
      userId: appUser.id,
    });
  });
