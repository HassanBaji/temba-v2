import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mintLink } from "#src/invites/doors";
import { teamInviteLinkUrl } from "#src/invites/tokens";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { teamId: string; userId: string; origin: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { team } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
    locale,
  );

  const minted = await mintLink(
    database,
    { kind: "team", id: team.id },
    { createdBy: args.userId },
  );
  if (!minted.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Invite link",
    });
  }

  return {
    id: minted.link.id,
    inviteUrl: teamInviteLinkUrl(args.origin, minted.link.token),
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}

export const createInviteLinkProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createInviteLink(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    });
  });
