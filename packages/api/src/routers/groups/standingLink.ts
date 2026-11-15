import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groupSeasons } from "@repo/db";
import { standingShareQuery } from "@repo/domain/standing-share";
import type { StandingView } from "@repo/domain/standing-views";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

/** The web page a shared Standing opens on: Group home, on its Standing tab. */
function groupStandingPath(
  groupId: string,
  query: { season: string; view: StandingView },
) {
  const search = new URLSearchParams(query);
  return `/dashboard/groups/${groupId}?${search.toString()}`;
}

/**
 * The link the Standing share sheet copies (design "Group standings" 2a): it
 * opens the same lens and view in Temba. Group home shows the Standing to
 * members only, so the link is only any use to them. Members only.
 */
export async function standingLink(
  database: DbClient,
  args: {
    groupId: string;
    seasonId: string | null;
    view: StandingView;
    userId: string;
    origin: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.standingMembersOnly,
    });
  }
  if (args.seasonId) {
    const season = await database.query.groupSeasons.findFirst({
      where: and(
        eq(groupSeasons.id, args.seasonId),
        eq(groupSeasons.groupId, group.id),
      ),
      columns: { id: true },
    });
    if (!season) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).group.errors.seasonNotFound,
      });
    }
  }
  return {
    url: `${args.origin}${groupStandingPath(
      group.id,
      standingShareQuery(args.seasonId, args.view),
    )}`,
  };
}

export const standingLinkProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      seasonId: z.string().uuid().nullable(),
      view: z.enum(["overall", "by-level", "most-improved"]),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return standingLink(ctx.db, {
      groupId: input.groupId,
      seasonId: input.seasonId,
      view: input.view,
      userId: appUser.id,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    });
  });
