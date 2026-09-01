import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { teamEmailInvites, teamMembers, teams } from "@repo/db";

import { killTeamOpenSeatDoors } from "~/server/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function dissolve(
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
      message: "Only a Team member can dissolve this Team",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  const incomplete = memberRows.length < 2;

  if (incomplete && team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can dissolve an incomplete Team",
    });
  }

  await database.transaction(async (tx) => {
    await killTeamOpenSeatDoors(tx, team.id);

    await tx
      .update(teamEmailInvites)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamEmailInvites.teamId, team.id),
          isNull(teamEmailInvites.acceptedAt),
          isNull(teamEmailInvites.revokedAt),
        ),
      );

    await tx.delete(teams).where(eq(teams.id, team.id));
  });

  return {
    ok: true as const,
    teamId: team.id,
  };
}
