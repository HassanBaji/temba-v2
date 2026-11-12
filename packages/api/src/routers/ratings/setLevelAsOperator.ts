import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { applyLevelOverride } from "#src/ratings/apply-level-override";
import { operatorProcedure } from "#src/trpc";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * An Operator sets any User's Level in either sport, their own included, with
 * no Group in between. The override is recorded with no Group (ADR-0077).
 */
export async function setLevelAsOperator(
  database: DbClient,
  args: {
    operatorUserId: string;
    targetUserId: string;
    sport: Sport;
    levelTenths: number;
    reason?: LevelOverrideReason | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const target = await database.query.user.findFirst({
    where: eq(user.id, args.targetUserId),
    columns: { id: true },
  });
  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).profile.errors.playerNotFound,
    });
  }

  return applyLevelOverride(database, {
    sport: args.sport,
    setterUserId: args.operatorUserId,
    targetUserId: target.id,
    groupId: null,
    levelTenths: args.levelTenths,
    reason: args.reason,
    locale,
  });
}

export const setLevelAsOperatorProcedure = operatorProcedure
  .input(
    z.object({
      userId: z.string().uuid(),
      sport: sportSchema,
      levelTenths: z.number().int().min(LEVEL_TENTHS_MIN).max(LEVEL_TENTHS_MAX),
      reason: z.enum(LEVEL_OVERRIDE_REASONS).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return setLevelAsOperator(ctx.db, {
      operatorUserId: operator.id,
      targetUserId: input.userId,
      sport: input.sport,
      levelTenths: input.levelTenths,
      reason: input.reason,
      locale: ctx.locale,
    });
  });
