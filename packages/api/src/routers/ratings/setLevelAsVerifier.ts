import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  applyLevelOverride,
  requestedOverrideLevel,
} from "#src/ratings/apply-level-override";
import { calibrationVenueFor } from "#src/ratings/verifier-calibration";
import { protectedProcedure } from "#src/trpc";
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
 * A Verifier calibrates another User's Level in either sport, from a Venue
 * where they hold the role and the player played or belongs to a Club Group
 * (ADR-0072). Football may be set as an OVR. The override names the Venue,
 * and the player is told who, where and why at once.
 */
export async function setLevelAsVerifier(
  database: DbClient,
  args: {
    verifierUserId: string;
    targetUserId: string;
    sport: Sport;
    levelTenths?: number | null;
    ovr?: number | null;
    reason: LevelOverrideReason;
    note?: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).level.errors;
  if (args.targetUserId === args.verifierUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.ownLevel });
  }
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
  const { isVerifier, venue } = await calibrationVenueFor(database, {
    verifierUserId: args.verifierUserId,
    targetUserId: target.id,
  });
  if (!venue) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: isVerifier ? errors.notAtVerifierVenue : errors.notVerifier,
    });
  }

  return database.transaction(async (tx) => {
    const result = await applyLevelOverride(tx, {
      sport: args.sport,
      setterUserId: args.verifierUserId,
      setByRole: "verifier",
      targetUserId: target.id,
      groupId: null,
      venueId: venue.id,
      level,
      reason: args.reason,
      note: args.note,
      locale,
    });
    await notify(tx, {
      type: "level_set",
      recipients: [{ userId: target.id, audience: "player" }],
      excludeUserIds: [args.verifierUserId],
      actorUserId: args.verifierUserId,
      levelOverrideId: result.overrideId,
    });
    return { ...result, venue };
  });
}

export const setLevelAsVerifierInputSchema = z.object({
  userId: z.string().uuid(),
  sport: sportSchema,
  levelTenths: z
    .number()
    .int()
    .min(LEVEL_TENTHS_MIN)
    .max(LEVEL_TENTHS_MAX)
    .optional(),
  ovr: z.number().int().min(OVR_MIN).max(OVR_MAX).optional(),
  reason: z.enum(LEVEL_OVERRIDE_REASONS),
  note: z.string().trim().max(LEVEL_OVERRIDE_NOTE_MAX).optional(),
});

export const setLevelAsVerifierProcedure = protectedProcedure
  .input(setLevelAsVerifierInputSchema)
  .mutation(async ({ ctx, input }) => {
    const verifier = await resolveAppUser(ctx.userId);
    return setLevelAsVerifier(ctx.db, {
      verifierUserId: verifier.id,
      targetUserId: input.userId,
      sport: input.sport,
      levelTenths: input.levelTenths,
      ovr: input.ovr,
      reason: input.reason,
      note: input.note,
      locale: ctx.locale,
    });
  });
