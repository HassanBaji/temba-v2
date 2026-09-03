import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teamInviteLinks } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { acceptLink } from "~/server/invites/doors";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { killTeamOpenSeatDoors } from "~/server/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { refuseIfLinkedCommunityArchived } from "~/server/teams/helpers/refuse-if-linked-community-archived";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { unorderedPairIsReserved } from "~/server/teams/helpers/unordered-pair-is-reserved";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: { token: string; userId: string },
) {
  const link = await database.query.teamInviteLinks.findFirst({
    where: eq(teamInviteLinks.token, args.token),
  });

  if (!link || !isInviteLinkLive(link.expiresAt)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is not available",
    });
  }

  const team = await requireTeam(database, link.teamId);
  await refuseIfLinkedCommunityArchived(
    database,
    team,
    "Cannot accept a Team invite while the linked Community is archived",
  );

  const memberRows = await listTeamMembers(database, team.id);
  const existing = memberRows.find((row) => row.userId === args.userId);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already a member of this Team",
    });
  }

  if (memberRows.length >= 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is full",
    });
  }

  const creatorId = memberRows[0]?.userId ?? team.createdBy;
  if (await unorderedPairIsReserved(database, creatorId, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This pair already has a Team or a pending invite",
    });
  }

  await database.transaction(async (tx) => {
    const accepted = await acceptLink(tx, "team", {
      token: args.token,
      userId: args.userId,
    });
    if (!accepted.ok) {
      if (accepted.reason === "already_member") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this Team",
        });
      }
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite link is not available",
      });
    }

    await killTeamOpenSeatDoors(tx, team.id);
  });

  return {
    teamId: team.id,
    alreadyMember: false as const,
  };
}

export const acceptInviteLinkProcedure = protectedProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
    });
  });
