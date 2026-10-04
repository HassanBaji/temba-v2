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
import { removeGroupImageObject } from "#src/storage/group-images";

type DbClient = typeof db;

export async function clearImage(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "host", {
      frozenMessage:
        "Cannot clear a Group image while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  await removeGroupImageObject(args.groupId);

  const [updated] = await database
    .update(groups)
    .set({
      imageUrl: null,
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
      message: "Failed to clear Group image",
    });
  }

  return updated;
}

export const clearImageProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return clearImage(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
