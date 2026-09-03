import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { teamMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { acceptLookup } from "~/server/invites/doors";
import { killTeamOpenSeatDoors } from "~/server/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { refuseIfLinkedCommunityArchived } from "~/server/teams/helpers/refuse-if-linked-community-archived";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { unorderedPairIsReserved } from "~/server/teams/helpers/unordered-pair-is-reserved";

type DbClient = typeof db;

export async function acceptInAppInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.teamMemberInvites.findFirst({
    where: eq(teamMemberInvites.id, args.inviteId),
  });

  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team invite is not available",
    });
  }

  if (invite.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This invite is for a different User",
    });
  }

  const team = await requireTeam(database, invite.teamId);
  await refuseIfLinkedCommunityArchived(
    database,
    team,
    "Cannot accept a Team invite while the linked Community is archived",
  );
  const memberRows = await listTeamMembers(database, team.id);

  const existing = memberRows.find((row) => row.userId === args.userId);
  if (existing) {
    await database
      .update(teamMemberInvites)
      .set({
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamMemberInvites.id, invite.id),
          isNull(teamMemberInvites.acceptedAt),
          isNull(teamMemberInvites.revokedAt),
        ),
      );

    return {
      ok: true as const,
      teamId: team.id,
      alreadyMember: true as const,
    };
  }

  if (memberRows.length >= 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is full",
    });
  }

  const creatorId = memberRows[0]?.userId ?? team.createdBy;
  if (
    await unorderedPairIsReserved(database, creatorId, args.userId, invite.id)
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This pair already has a Team or a pending invite",
    });
  }

  await database.transaction(async (tx) => {
    const accepted = await acceptLookup(
      tx,
      { kind: "team", id: team.id },
      { inviteId: invite.id, userId: args.userId },
    );
    if (!accepted.ok) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Team invite is not available",
      });
    }

    await killTeamOpenSeatDoors(tx, team.id);
  });

  return {
    ok: true as const,
    teamId: team.id,
    alreadyMember: false as const,
  };
}

export const acceptInAppInviteProcedure = protectedProcedure
  .input(z.object({ inviteId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInAppInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
    });
  });
