import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamLinkRequests, TeamLinkRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

export async function rejectTeamLink(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.teamLinkRequests.findFirst({
    where: eq(teamLinkRequests.id, args.requestId),
  });

  if (request?.status !== "pending") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team link request is not available",
    });
  }

  await requireStaff(
    database,
    request.communityId,
    args.userId,
    "Only Owner or Admin can reject Team link requests",
  );

  const community = await requireCommunity(database, request.communityId);
  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot reject Team link requests for an archived Community",
  });

  const [updated] = await database
    .update(teamLinkRequests)
    .set({
      status: TeamLinkRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamLinkRequests.id, request.id),
        eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
      ),
    )
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Team link request is no longer pending",
    });
  }

  return {
    ok: true as const,
    teamId: request.teamId,
    communityId: request.communityId,
  };
}

export const rejectTeamLinkProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return rejectTeamLink(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
