import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

const UNDOABLE_STATUSES: string[] = [
  GroupJoinRequestStatusEnum.APPROVED,
  GroupJoinRequestStatusEnum.REJECTED,
  GroupJoinRequestStatusEnum.BLOCKED,
];

export async function undoJoinRequestDecision(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.groupJoinRequests.findFirst({
    where: eq(groupJoinRequests.id, args.requestId),
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Join request not found",
    });
  }

  const group = await requireGroup(database, request.groupId);

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "join", {
      frozenMessage:
        "Cannot change join requests while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  if (!UNDOABLE_STATUSES.includes(request.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request has not been decided",
    });
  }

  await database.transaction(async (tx) => {
    if (request.status === "approved") {
      const membership = await tx.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, request.userId),
        ),
        columns: { id: true, totalGamesPlayed: true },
      });
      if (membership) {
        if (membership.totalGamesPlayed > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "They have already played in this Group",
          });
        }
        if (await isAppointedOrganizer(tx, group, request.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "They are an Organizer of this Group",
          });
        }
        await tx.delete(groupMembers).where(eq(groupMembers.id, membership.id));
      }
      // Community admission stays: they may have joined other Groups in that Community since.
    }

    await tx
      .update(groupJoinRequests)
      .set({
        status: GroupJoinRequestStatusEnum.PENDING,
        decidedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(groupJoinRequests.id, request.id));
  });

  return { ok: true as const };
}

export const undoJoinRequestDecisionProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoJoinRequestDecision(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
