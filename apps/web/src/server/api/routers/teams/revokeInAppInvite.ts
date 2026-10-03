import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teamMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { revokeLookup } from "~/server/invites/doors";
import { requireTeam } from "~/server/teams/helpers/require-team";

type DbClient = typeof db;

export async function revokeInAppInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.teamMemberInvites.findFirst({
    where: eq(teamMemberInvites.id, args.inviteId),
  });

  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team invite not found",
    });
  }

  const team = await requireTeam(database, invite.teamId);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can revoke Team invites",
    });
  }

  if (invite.acceptedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Accepted invites cannot be revoked",
    });
  }

  if (invite.revokedAt) {
    return { ok: true as const };
  }

  const revoked = await revokeLookup(
    database,
    { kind: "team", id: team.id },
    invite.id,
  );
  if (!revoked.ok && revoked.reason === "already_accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Accepted invites cannot be revoked",
    });
  }
  if (!revoked.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to revoke Team invite",
    });
  }

  return { ok: true as const };
}

export const revokeInAppInviteProcedure = protectedProcedure
  .input(z.object({ inviteId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return revokeInAppInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
    });
  });
