import { eq, inArray } from "drizzle-orm";

import { teamMembers, type GroupSportEnum } from "@repo/db";

import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function mine(database: DbClient, args: { userId: string }) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, args.userId),
    with: {
      team: {
        with: {
          community: true,
        },
      },
    },
  });

  const teamIds = memberships.map((membership) => membership.team.id);
  const memberRows =
    teamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, teamIds),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

  const membersByTeam = new Map<string, typeof memberRows>();
  for (const row of memberRows) {
    const list = membersByTeam.get(row.teamId) ?? [];
    list.push(row);
    membersByTeam.set(row.teamId, list);
  }

  return memberships.map((membership) => {
    const team = membership.team;
    const members = membersByTeam.get(team.id) ?? [];
    const memberNames = members.map((member) => member.user.name);
    const community = team.community;

    return {
      id: team.id,
      name: team.name,
      displayName: teamDisplayName(team.name, memberNames),
      sport: team.sport as GroupSportEnum,
      community: community
        ? {
            id: community.id,
            name: community.name,
            archivedAt: community.archivedAt,
          }
        : null,
      members: members.map((member) => ({
        name: member.user.name,
        image: member.user.image,
      })),
      memberCount: members.length,
      incomplete: members.length < 2,
    };
  });
}
