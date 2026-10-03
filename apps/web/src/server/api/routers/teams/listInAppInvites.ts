import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { listLookup } from "~/server/invites/doors";
import { requireTeam } from "~/server/teams/helpers/require-team";

type DbClient = typeof db;

export async function listInAppInvites(
  database: DbClient,
  args: { teamId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can list Team invites",
    });
  }

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can list Team invites",
    });
  }

  return listLookup(database, { kind: "team", id: team.id });
}

export const listInAppInvitesProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listInAppInvites(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
    });
  });
