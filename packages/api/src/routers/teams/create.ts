import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { teamMembers, teams, type GroupSportEnum } from "@repo/db";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireTagGroup } from "#src/teams/helpers/require-tag-group";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";

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
    groupId?: string;
  },
) {
  // The creator is the Captain, who may tag the new Team to a Group of its sport.
  const tagGroup = args.groupId
    ? await requireTagGroup(database, args.groupId, args.sport)
    : null;

  const created = await database.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name: optionalTeamName(args.name),
        sport: args.sport,
        createdBy: args.userId,
        groupId: tagGroup?.id ?? null,
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
    createdBy: created.createdBy,
    createdAt: created.createdAt,
    groupTag: tagGroup ? { id: tagGroup.id, name: tagGroup.name } : null,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

export const create = protectedProcedure
  .input(
    z.object({
      name: z.string().trim().max(255).optional(),
      sport: sportSchema,
      groupId: z.string().uuid().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createTeam(ctx.db, {
      name: input.name,
      sport: input.sport,
      groupId: input.groupId,
      userId: appUser.id,
      userName: appUser.name,
    });
  });
