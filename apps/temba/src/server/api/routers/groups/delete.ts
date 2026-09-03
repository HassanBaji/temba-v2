import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { deleteEmptyGroup } from "~/server/groups/helpers/delete-empty-group";

type DbClient = typeof db;

export async function deleteGroup(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  return deleteEmptyGroup({
    database,
    groupId: args.groupId,
    callerId: args.userId,
  });
}

export const deleteProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deleteGroup(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
