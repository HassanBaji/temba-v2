import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupSeasons } from "@repo/db";

import { groupSeasonStatus } from "@repo/domain/group-season";
import { productDayKey } from "@repo/domain/product-timezone";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { relinkGamesAfterSeasonClose } from "#src/games/season-link";
import { assertCanManageSeasons } from "#src/groups/helpers/season-access";
import { requireGroup } from "#src/groups/helpers/require-group";
import { toSeasonRow } from "#src/standing/load-group-standing";

type DbClient = typeof db;

/**
 * Closes the active Season today (design "Seasons" 1l): its last day becomes
 * today and the closing instant is stamped, so the Standing stops reading
 * Matches from there on and a new Season may open tomorrow. Games linked to
 * it on later days move to the Season that holds their day, or go friendly.
 */
export async function closeSeason(
  database: DbClient,
  args: { seasonId: string; userId: string; now?: Date; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const season = await database.query.groupSeasons.findFirst({
    where: eq(groupSeasons.id, args.seasonId),
  });
  if (!season) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.seasonNotFound,
    });
  }
  const group = await requireGroup(database, season.groupId, locale);
  assertCanManageSeasons(group, args.userId, locale);

  if (groupSeasonStatus(season, now) !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.seasonNotActive,
    });
  }

  const [closed] = await database
    .update(groupSeasons)
    .set({
      endsOn: productDayKey(now),
      closedAt: now,
      closedBy: args.userId,
      updatedAt: now,
    })
    .where(eq(groupSeasons.id, season.id))
    .returning();
  if (!closed) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to close the season",
    });
  }
  await relinkGamesAfterSeasonClose(database, closed, now);
  return toSeasonRow(closed, now);
}

export const closeSeasonProcedure = protectedProcedure
  .input(z.object({ seasonId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return closeSeason(ctx.db, {
      seasonId: input.seasonId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
