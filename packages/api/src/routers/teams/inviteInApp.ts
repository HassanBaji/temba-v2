import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import { teamRosterRule } from "@repo/domain/team-roster";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import { mintLookup } from "#src/invites/doors";
import { notifyTeamInvite } from "#src/notifications/notify-team-invite";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unorderedPairIsReserved } from "#src/teams/helpers/unordered-pair-is-reserved";
import { teamInviteBudget } from "#src/teams/helpers/unused-invites-for-team";

type DbClient = typeof db;

export async function inviteInApp(
  database: DbClient,
  args: {
    teamId: string;
    userId: string;
    inviteeUserId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { team, memberRows } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
    locale,
  );

  const invitee = await database.query.user.findFirst({
    where: eq(user.id, args.inviteeUserId),
    columns: {
      id: true,
      name: true,
    },
  });

  if (!invitee) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).profile.errors.userNotFound,
    });
  }

  if (invitee.id === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).team.errors.inviteSelf,
    });
  }

  const alreadyMember = memberRows.some((row) => row.userId === invitee.id);
  if (alreadyMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).team.errors.userAlreadyMember,
    });
  }

  const { lookupInvites, budget } = await teamInviteBudget(
    database,
    team,
    memberRows.length,
  );
  if (lookupInvites.some((invite) => invite.userId === invitee.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).invite.errors.lookupExists,
    });
  }
  if (budget === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).team.errors.revokeUnusedFirst,
    });
  }

  if (
    teamRosterRule(team.sport).pairIsUnique &&
    (await unorderedPairIsReserved(database, args.userId, invitee.id))
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).team.errors.pairTaken,
    });
  }

  const minted = await database.transaction(async (tx) => {
    const result = await mintLookup(
      tx,
      { kind: "team", id: team.id },
      { userId: invitee.id, invitedBy: args.userId },
    );
    if (!result.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Team invite",
      });
    }
    await notifyTeamInvite(tx, {
      teamId: team.id,
      inviterUserId: args.userId,
      inviteeUserIds: [invitee.id],
    });
    return result;
  });

  return {
    id: minted.invite.id,
    teamId: minted.invite.hostId,
    userId: minted.invite.userId,
    createdAt: minted.invite.createdAt,
  };
}

export const inviteInAppProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.invite, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return inviteInApp(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      inviteeUserId: input.userId,
      locale: ctx.locale,
    });
  });
