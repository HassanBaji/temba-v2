import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teamInviteLinks, teams } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { teamIsFull, teamRosterRule } from "@repo/domain/team-roster";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import { acceptLink } from "#src/invites/doors";
import { isInviteLinkLive } from "#src/invites/invite-link-expiry";
import { killTeamOpenSeatDoors } from "#src/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireTeam } from "#src/teams/helpers/require-team";
import { unorderedPairIsReserved } from "#src/teams/helpers/unordered-pair-is-reserved";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: { token: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const link = await database.query.teamInviteLinks.findFirst({
    where: eq(teamInviteLinks.token, args.token),
  });

  if (!link || !isInviteLinkLive(link.expiresAt)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.linkUnavailable,
    });
  }

  const team = await requireTeam(database, link.teamId, locale);

  await database.transaction(async (tx) => {
    await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, team.id))
      .for("update");
    const memberRows = await listTeamMembers(tx, team.id);
    const existing = memberRows.find((row) => row.userId === args.userId);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).team.errors.alreadyMember,
      });
    }

    if (teamIsFull(memberRows.length, team.sport)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).team.errors.full,
      });
    }

    const creatorId = memberRows[0]?.userId ?? team.createdBy;
    if (
      teamRosterRule(team.sport).pairIsUnique &&
      (await unorderedPairIsReserved(tx, creatorId, args.userId))
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).team.errors.pairTaken,
      });
    }

    const accepted = await acceptLink(tx, "team", {
      token: args.token,
      userId: args.userId,
      locale: args.locale ?? DEFAULT_LOCALE,
    });
    if (!accepted.ok) {
      if (accepted.reason === "already_member") {
        throw new TRPCError({
          code: "CONFLICT",
          message: messagesFor(locale).team.errors.alreadyMember,
        });
      }
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).invite.errors.linkUnavailable,
      });
    }

    if (teamIsFull(memberRows.length + 1, team.sport)) {
      await killTeamOpenSeatDoors(tx, team.id);
    }
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
      locale: ctx.locale,
    });
  });
