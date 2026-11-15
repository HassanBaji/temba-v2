import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { listLookup } from "#src/invites/doors";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

export async function listInAppInvites(
  database: DbClient,
  args: { teamId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = await requireTeam(database, args.teamId, locale);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).team.errors.creatorListsInvites,
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
      message: messagesFor(locale).team.errors.creatorListsInvites,
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
      locale: ctx.locale,
    });
  });
