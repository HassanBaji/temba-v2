import { TRPCError } from "@trpc/server";

import { teamMembers, teams, type GroupSportEnum } from "@repo/db";

import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import { type db } from "~/server/db";

type DbClient = typeof db;

function optionalTeamName(name: string | undefined) {
  if (!name || name.length === 0) {
    return null;
  }
  return name;
}

export async function createTeam(
  database: DbClient,
  args: {
    name: string | undefined;
    sport: "padel" | "football";
    userId: string;
    userName: string;
  },
) {
  const created = await database.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name: optionalTeamName(args.name),
        sport: args.sport,
        communityId: null,
        createdBy: args.userId,
      })
      .returning();

    if (!team) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Team",
      });
    }

    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId: args.userId,
    });

    return team;
  });

  return {
    id: created.id,
    name: created.name,
    displayName: teamDisplayName(created.name, [args.userName]),
    sport: created.sport as GroupSportEnum,
    communityId: created.communityId,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
    gamesPlayed: created.gamesPlayed,
    wins: created.wins,
    losses: created.losses,
  };
}
