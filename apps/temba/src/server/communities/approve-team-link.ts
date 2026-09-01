import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  communitySports,
  CommunityRoleEnum,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  teams,
} from "@repo/db";

import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "~/server/community-membership";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function approveTeamLink(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.teamLinkRequests.findFirst({
    where: eq(teamLinkRequests.id, args.requestId),
    with: {
      team: true,
    },
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
    "Only Owner or Admin can approve Team link requests",
  );

  const community = await requireCommunity(database, request.communityId);
  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage:
      "Cannot approve Team link requests for an archived Community",
  });

  if (request.team.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is already linked to a Community",
    });
  }

  const allowedSport = await database.query.communitySports.findFirst({
    where: and(
      eq(communitySports.communityId, request.communityId),
      eq(communitySports.sport, request.team.sport),
    ),
  });

  if (!allowedSport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sport is not on this Community's sports allow-list",
    });
  }

  const memberRows = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, request.team.id),
  });

  if (memberRows.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Incomplete Teams cannot be linked",
    });
  }

  await database.transaction(async (tx) => {
    for (const member of memberRows) {
      const admitted = await admitCommunityMember(tx, {
        communityId: request.communityId,
        userId: member.userId,
        role: CommunityRoleEnum.MEMBER,
      });
      if (!admitted.ok && admitted.reason !== "already_member") {
        throwAdmitFailure(admitted);
      }
    }

    await tx
      .update(teams)
      .set({
        communityId: request.communityId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, request.team.id));

    const [updated] = await tx
      .update(teamLinkRequests)
      .set({
        status: TeamLinkRequestStatusEnum.APPROVED,
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
  });

  return {
    ok: true as const,
    teamId: request.team.id,
    communityId: request.communityId,
  };
}
