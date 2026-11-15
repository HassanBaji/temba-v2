import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  applyLevelOverride,
  assertLevelOverrideReason,
  requestedOverrideLevel,
} from "#src/ratings/apply-level-override";
import { operatorProcedure } from "#src/trpc";
import { OVR_MAX, OVR_MIN } from "@repo/domain/football-ovr";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_NOTE_MAX,
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
 * no Group in between (ADR-0077), and a reason the player is told at once
 * (ADR-0073). Football may be set as an OVR. The override is recorded with no
 * Group.
 */
export async function setLevelAsOperator(
  database: DbClient,
  args: {
    operatorUserId: string;
    targetUserId: string;
    sport: Sport;
    levelTenths?: number | null;
    ovr?: number | null;
    reason?: LevelOverrideReason | null;
    note?: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const level = requestedOverrideLevel(args, locale);
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
  const reason = args.reason;
  assertLevelOverrideReason(reason, locale);

  return database.transaction(async (tx) => {
    const result = await applyLevelOverride(tx, {
      sport: args.sport,
      setterUserId: args.operatorUserId,
      setByRole: "operator",
      targetUserId: target.id,
      groupId: null,
      level,
      reason,
      note: args.note,
      locale,
    });
    await notify(tx, {
      type: "level_set",
      recipients: [{ userId: target.id, audience: "player" }],
      excludeUserIds: [args.operatorUserId],
      actorUserId: args.operatorUserId,
      levelOverrideId: result.overrideId,
    });
    return result;
  });
}

export const setLevelAsOperatorProcedure = operatorProcedure
  .input(
    z.object({
      userId: z.string().uuid(),
      sport: sportSchema,
      levelTenths: z
        .number()
        .int()
        .min(LEVEL_TENTHS_MIN)
        .max(LEVEL_TENTHS_MAX)
        .optional(),
      ovr: z.number().int().min(OVR_MIN).max(OVR_MAX).optional(),
      reason: z.enum(LEVEL_OVERRIDE_REASONS).optional(),
      note: z.string().trim().max(LEVEL_OVERRIDE_NOTE_MAX).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return setLevelAsOperator(ctx.db, {
      operatorUserId: operator.id,
      targetUserId: input.userId,
      sport: input.sport,
      levelTenths: input.levelTenths,
      ovr: input.ovr,
      reason: input.reason,
      note: input.note,
      locale: ctx.locale,
    });
  });
