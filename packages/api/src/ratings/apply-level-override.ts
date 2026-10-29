import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { GroupSportEnum, levelOverrides, ratings } from "@repo/db";

import { type db } from "#src/db";
import {
  bandFromLevel,
  confirmedPhiForOverride,
  formatLevel,
  initialRatingFromChoice,
  levelFromMu,
  muFromLevel,
} from "@repo/domain/level";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { type LevelOverrideReason } from "@repo/domain/level-slider";
import type { Sport } from "@repo/domain/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function assertLevelTenths(levelTenths: number) {
  if (
    !Number.isInteger(levelTenths) ||
    levelTenths < LEVEL_TENTHS_MIN ||
    levelTenths > LEVEL_TENTHS_MAX
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Level must be between 0.0 and 7.0",
    });
  }
}

/**
 * Writes a Level override. The set Level is a new Glicko-2 baseline: μ from
 * the chosen Level, φ lowered to at most the override ceiling so the Rating is
 * confirmed, σ and `last_rated_at` kept. Every set appends a
 * `level_overrides` row; nothing reads its before-values back. `groupId` is
 * the Group a Level setter set it from, null when an Operator set it.
 */
export async function applyLevelOverride(
  database: DbClient,
  args: {
    sport: Sport;
    setterUserId: string;
    targetUserId: string;
    groupId: string | null;
    levelTenths: number;
    reason?: LevelOverrideReason | null;
  },
) {
  assertLevelTenths(args.levelTenths);
  const level = args.levelTenths / 10;
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
        reason: args.reason ?? null,
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
        levelBand: after.levelBand,
        provisional: false as const,
      },
    };
  });
}
