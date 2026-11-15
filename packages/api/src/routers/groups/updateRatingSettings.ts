import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups } from "@repo/db";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import {
  isPerformanceWeight,
  PERFORMANCE_RATING_MODES,
  ratingSettingsLine,
  ratingSettingsSummary,
  type GroupRatingSettings,
  type PerformanceRatingMode,
} from "@repo/domain/group-rating-settings";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

/**
 * An Organizer of a tier Group changes its Rating settings (ADR-0068). Only
 * the Group row changes: a Match snapshots the settings when it completes, so
 * the change applies from the next Game and no completed Match moves again.
 */
export async function updateRatingSettings(
  database: DbClient,
  args: {
    groupId: string;
    organizerUserId: string;
    mode: PerformanceRatingMode;
    weightPercent: number;
    organizerCountsDouble: boolean;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.settings.errors;
  const group = await requireGroup(database, args.groupId, locale);
  if (!(await mayOrganizeGroupGames(database, group, args.organizerUserId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.organizerOnly });
  }
  if (!groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errors.noTier,
    });
  }
  if (!isPerformanceWeight(args.weightPercent)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.weight });
  }
  const settings: GroupRatingSettings = {
    mode: args.mode,
    weightPercent: args.weightPercent,
    organizerCountsDouble: args.organizerCountsDouble,
  };
  await database
    .update(groups)
    .set({
      performanceRatingMode: settings.mode,
      performanceWeightPercent: settings.weightPercent,
      organizerCountsDouble: settings.organizerCountsDouble,
      updatedAt: args.now ?? new Date(),
    })
    .where(eq(groups.id, group.id));
  return {
    settings,
    summary: ratingSettingsSummary(settings, locale),
    line: ratingSettingsLine(settings, locale),
  };
}

export const updateRatingSettingsProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      mode: z.enum(PERFORMANCE_RATING_MODES),
      weightPercent: z.number().int(),
      organizerCountsDouble: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateRatingSettings(ctx.db, {
      groupId: input.groupId,
      organizerUserId: appUser.id,
      mode: input.mode,
      weightPercent: input.weightPercent,
      organizerCountsDouble: input.organizerCountsDouble,
      locale: ctx.locale,
    });
  });
