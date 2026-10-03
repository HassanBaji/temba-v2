import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communitySports,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { requireTeam } from "~/server/teams/helpers/require-team";

type DbClient = typeof db;

export async function requestLink(
  database: DbClient,
  args: { teamId: string; communityId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only a Team member can request a Community link",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  if (memberRows.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Incomplete Teams cannot request a Community link",
    });
  }

  if (team.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is already linked to a Community",
    });
  }

  const community = await database.query.communities.findFirst({
    where: eq(communities.id, args.communityId),
  });

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found",
    });
  }

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot request a Team link to an archived Community",
  });

  const allowedSport = await database.query.communitySports.findFirst({
    where: and(
      eq(communitySports.communityId, community.id),
      eq(communitySports.sport, team.sport),
    ),
  });

  if (!allowedSport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sport is not on this Community's sports allow-list",
    });
  }

  const pending = await database.query.teamLinkRequests.findFirst({
    where: and(
      eq(teamLinkRequests.teamId, team.id),
      eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
    ),
  });

  if (pending) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This Team already has a pending link request",
    });
  }

  const [created] = await database
    .insert(teamLinkRequests)
    .values({
      teamId: team.id,
      communityId: community.id,
      requestedBy: args.userId,
      status: TeamLinkRequestStatusEnum.PENDING,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Team link request",
    });
  }

  return {
    id: created.id,
    teamId: created.teamId,
    communityId: created.communityId,
    status: created.status,
  };
}

export const requestLinkProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
      communityId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestLink(ctx.db, {
      teamId: input.teamId,
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
