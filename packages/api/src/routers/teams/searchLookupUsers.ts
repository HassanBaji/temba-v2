import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { searchLookupUsers as searchLookupUsersDoor } from "#src/invites/search-lookup-users";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { peopleTheViewerPlaysWith } from "#src/teams/helpers/people-the-viewer-plays-with";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";

type DbClient = typeof db;

/**
 * Without a Team it serves the New team screen. There is no Roster to invite
 * into yet, so a name finds only people the viewer already plays with; anyone
 * else is found by their full email or phone number.
 */
export async function searchLookupUsers(
  database: DbClient,
  args: { teamId?: string; userId: string; query: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (!args.teamId) {
    return searchLookupUsersDoor(database, {
      query: args.query,
      excludeUserIds: [args.userId],
      nameScopeUserIds: await peopleTheViewerPlaysWith(database, args.userId),
    });
  }
  const { team, memberRows } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
    locale,
  );
  const unusedLookups = await unusedLookupInvitesForTeam(database, team.id);

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds: [
      args.userId,
      ...memberRows.map((row) => row.userId),
      ...unusedLookups.map((invite) => invite.userId),
    ],
  });
}

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid().optional(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.lookupSearch, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return searchLookupUsers(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      query: input.query,
      locale: ctx.locale,
    });
  });
