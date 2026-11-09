import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireTeam } from "#src/teams/helpers/require-team";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

/** For a mistake on the Roster; account holders leave the Team themselves. */
export async function removeUnclaimedPlayer(
  database: DbClient,
  args: { teamId: string; captainUserId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);
  if (team.createdBy !== args.captainUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the Captain can remove players",
    });
  }

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
    columns: { id: true },
    with: { user: { columns: { clerkId: true, addedAt: true } } },
  });
  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This player is not on the Roster",
    });
  }
  if (!isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only players not on Temba yet can be removed",
    });
  }

  await database.delete(teamMembers).where(eq(teamMembers.id, membership.id));

  return { ok: true as const, teamId: team.id, userId: args.userId };
}

export const removeUnclaimedPlayerProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removeUnclaimedPlayer(ctx.db, {
      teamId: input.teamId,
      captainUserId: appUser.id,
      userId: input.userId,
    });
  });
