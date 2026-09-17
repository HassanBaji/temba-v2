import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups, GroupTypeEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGroupApprover } from "~/server/groups/helpers/is-group-approver";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "~/server/soft-archive";

type DbClient = typeof db;

export async function setRequiresApproval(
  database: DbClient,
  args: { groupId: string; requiresApproval: boolean; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  if (group.type !== GroupTypeEnum.PUBLIC) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Require approval only applies to Public Groups",
    });
  }

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "host", {
      frozenMessage:
        "Cannot change Require approval while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  const [updated] = await database
    .update(groups)
    .set({
      requiresApproval: args.requiresApproval,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, group.id))
    .returning({
      id: groups.id,
      requiresApproval: groups.requiresApproval,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update Require approval",
    });
  }

  return updated;
}

export const setRequiresApprovalProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      requiresApproval: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setRequiresApproval(ctx.db, {
      groupId: input.groupId,
      requiresApproval: input.requiresApproval,
      userId: appUser.id,
    });
  });
