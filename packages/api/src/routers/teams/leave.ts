import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers } from "@repo/db";
import { teamIsSquad } from "@repo/domain/team-roster";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { refuseIfLinkedCommunityArchived } from "#src/teams/helpers/refuse-if-linked-community-archived";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

export async function leave(
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
      message: "Only a Team member can leave this Team",
    });
  }

  if (!teamIsSquad(team.sport)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dissolve the Team instead",
    });
  }

  if (team.createdBy === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The creator cannot leave; dissolve the Team instead",
    });
  }

  await refuseIfLinkedCommunityArchived(
    database,
    team,
    "Cannot leave a Team linked to an archived Community",
  );

  await database.delete(teamMembers).where(eq(teamMembers.id, membership.id));

  return {
    ok: true as const,
    teamId: team.id,
  };
}

export const leaveProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leave(ctx.db, { teamId: input.teamId, userId: appUser.id });
  });
