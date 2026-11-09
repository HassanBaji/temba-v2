import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { groupMemberInvites, groupMembers } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import { requireGroupLookupSender } from "#src/groups/helpers/require-group-lookup-sender";
import { searchLookupUsers as searchLookupUsersDoor } from "#src/invites/search-lookup-users";

type DbClient = typeof db;

export async function searchLookupUsers(
  database: DbClient,
  args: { groupId: string; userId: string; query: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
    locale,
  );

  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { userId: true },
  });
  const unusedInvites = await database.query.groupMemberInvites.findMany({
    where: and(
      eq(groupMemberInvites.groupId, group.id),
      isNull(groupMemberInvites.acceptedAt),
      isNull(groupMemberInvites.revokedAt),
    ),
    columns: { userId: true },
  });

  const excludeUserIds = [
    args.userId,
    ...members.map((member) => member.userId),
    ...unusedInvites.map((invite) => invite.userId),
  ];

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds,
  });
}

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.lookupSearch, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return searchLookupUsers(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      query: input.query,
      locale: ctx.locale,
    });
  });
