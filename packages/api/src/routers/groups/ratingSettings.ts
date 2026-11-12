import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { groupHasTier } from "@repo/domain/game-rating-scope";
import {
  ratingSettingsLine,
  ratingSettingsSummary,
  type GroupRatingSettings,
} from "@repo/domain/group-rating-settings";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGroupMember } from "#src/games/access";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

/**
 * A tier Group's Rating settings (ADR-0068, screens 3a and 3b). Organizers get
 * the settings to change them; any other member gets only the line saying how
 * ratings work in the Group.
 */
export async function groupRatingSettings(
  database: DbClient,
  args: { groupId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.settings.errors;
  const group = await requireGroup(database, args.groupId, locale);
  if (!groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errors.noTier,
    });
  }
  const organizes = await mayOrganizeGroupGames(database, group, args.userId);
  if (!organizes && !(await isGroupMember(database, group.id, args.userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.notMember });
  }
  const settings: GroupRatingSettings = {
    mode: group.performanceRatingMode,
    weightPercent: group.performanceWeightPercent,
    organizerCountsDouble: group.organizerCountsDouble,
  };
  return {
    group: { id: group.id, name: group.name },
    canChange: organizes,
    settings: organizes ? settings : null,
    summary: organizes ? ratingSettingsSummary(settings, locale) : null,
    line: ratingSettingsLine(settings, locale),
  };
}

export const ratingSettingsProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return groupRatingSettings(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
