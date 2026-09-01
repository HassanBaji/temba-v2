import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  teams,
} from "@repo/db";

import { requireTeam } from "~/server/teams/helpers/require-team";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function unlink(
  database: DbClient,
  args: { teamId: string; userId: string },
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
      message: "Only a Team member can unlink this Team",
    });
  }

  if (!team.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is not linked to a Community",
    });
  }

  const previousCommunityId = team.communityId;

  await database.transaction(async (tx) => {
    await tx
      .update(teamLinkRequests)
      .set({
        status: TeamLinkRequestStatusEnum.REJECTED,
        decidedBy: args.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamLinkRequests.teamId, team.id),
          eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
        ),
      );

    await tx
      .update(teams)
      .set({
        communityId: null,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team.id));
  });

  return {
    ok: true as const,
    teamId: team.id,
    communityId: previousCommunityId,
  };
}
