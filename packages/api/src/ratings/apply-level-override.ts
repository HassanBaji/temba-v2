import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  GroupSportEnum,
  type LEVEL_OVERRIDE_SET_BY_ROLE_VALUES,
  levelOverrides,
  ratings,
} from "@repo/db";

import { type db } from "#src/db";
import {
  bandFromLevel,
  confirmedPhiForOverride,
  formatLevel,
  initialRatingFromChoice,
  levelFromMu,
  muFromLevel,
} from "@repo/domain/level";
import { formatOvr, ovrFromMu } from "@repo/domain/football-ovr";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_NOTE_MAX,
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import type { Sport } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LevelOverrideSetByRole =
  (typeof LEVEL_OVERRIDE_SET_BY_ROLE_VALUES)[number];

export function assertLevelTenths(
  levelTenths: number,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (
    !Number.isInteger(levelTenths) ||
    levelTenths < LEVEL_TENTHS_MIN ||
    levelTenths > LEVEL_TENTHS_MAX
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.between,
    });
  }
}

/** Every new Level override names a reason the player sees (ADR-0073). */
export function assertLevelOverrideReason(
  reason: LevelOverrideReason | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): asserts reason is LevelOverrideReason {
  if (
    !reason ||
    !(LEVEL_OVERRIDE_REASONS as readonly string[]).includes(reason)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.errors.reasonRequired,
    });
  }
}

/** A trimmed note of at most 280 characters, or null for a blank one. */
export function levelOverrideNote(note: string | null | undefined) {
  const trimmed = note?.trim().slice(0, LEVEL_OVERRIDE_NOTE_MAX);
  return trimmed === undefined || trimmed === "" ? null : trimmed;
}

function assertLevel(level: number, locale: Locale) {
  if (!Number.isFinite(level) || level < 0 || level > 7) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.between,
    });
  }
}

/**
 * Writes a Level override. The set Level is a new baseline: μ from the chosen
 * Level, φ lowered to at most the override ceiling so the Rating is
 * confirmed, σ and `last_rated_at` kept. The Level is continuous, so a
 * football OVR set by hand reads back as itself. Every set appends a
 * `level_overrides` row with who set it, by which door, and why; nothing
 * reads its before-values back. `groupId` is the Group a Level setter set it
 * from, null when an Operator set it.
 */
export async function applyLevelOverride(
  database: DbClient,
  args: {
    sport: Sport;
    setterUserId: string;
    setByRole: LevelOverrideSetByRole;
    targetUserId: string;
    groupId: string | null;
    level: number;
    reason: LevelOverrideReason;
    note?: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  assertLevel(args.level, locale);
  assertLevelOverrideReason(args.reason, locale);
  const level = args.level;
  const sport =
    args.sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;

  return database.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(ratings)
      .where(
        and(eq(ratings.userId, args.targetUserId), eq(ratings.sport, sport)),
      )
      .for("update");

    const before = existing ?? initialRatingFromChoice("unknown");
    const after = {
      mu: muFromLevel(level),
      phi: confirmedPhiForOverride(existing?.phi ?? null),
      sigma: before.sigma,
      levelBand: bandFromLevel(level),
    };
    const now = new Date();

    await tx
      .insert(ratings)
      .values({
        userId: args.targetUserId,
        sport,
        ...after,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.sport],
        set: { ...after, updatedAt: now },
      });

    const [override] = await tx
      .insert(levelOverrides)
      .values({
        userId: args.targetUserId,
        sport,
        setByUserId: args.setterUserId,
        groupId: args.groupId,
        setByRole: args.setByRole,
        reason: args.reason,
        note: levelOverrideNote(args.note),
        hadRating: existing !== undefined,
        muBefore: before.mu,
        phiBefore: before.phi,
        sigmaBefore: before.sigma,
        levelBandBefore: before.levelBand,
        muAfter: after.mu,
        phiAfter: after.phi,
        sigmaAfter: after.sigma,
        levelBandAfter: after.levelBand,
        createdAt: now,
      })
      .returning({ id: levelOverrides.id });
    if (!override) {
      throw new Error("Failed to record the Level override");
    }

    return {
      overrideId: override.id,
      level: {
        level: formatLevel(levelFromMu(after.mu)),
        ovr:
          sport === GroupSportEnum.FOOTBALL
            ? formatOvr(ovrFromMu(after.mu))
            : null,
        levelBand: after.levelBand,
        provisional: false as const,
      },
    };
  });
}
