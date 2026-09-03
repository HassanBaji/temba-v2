import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type TeamLinkRequest } from "~/server/communities/utils";
import { type db } from "~/server/db";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";

type DbClient = typeof db;

export async function listTeamLinkRequests(
  database: DbClient,
  args: { communityId: string; userId: string },
): Promise<TeamLinkRequest[]> {
  const community = await requireCommunity(database, args.communityId);
  await requireStaff(
    database,
    community.id,
    args.userId,
    "Only Owner or Admin can list Team link requests",
  );

  const rows = await database.query.teamLinkRequests.findMany({
    where: and(
      eq(teamLinkRequests.communityId, community.id),
      eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
    ),
    with: {
      team: true,
      requestedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const teamIds = rows.map((row) => row.team.id);
  const memberRows =
    teamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, teamIds),
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        });
  const membersByTeam = new Map<string, string[]>();
  for (const row of memberRows) {
    const list = membersByTeam.get(row.teamId) ?? [];
    list.push(row.user.name);
    membersByTeam.set(row.teamId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    team: {
      id: row.team.id,
      displayName: teamDisplayName(
        row.team.name,
        membersByTeam.get(row.team.id) ?? [],
      ),
      sport: row.team.sport as GroupSportEnum,
    },
    requestedBy: row.requestedBy,
  }));
}

export const listTeamLinkRequestsProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listTeamLinkRequests(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
