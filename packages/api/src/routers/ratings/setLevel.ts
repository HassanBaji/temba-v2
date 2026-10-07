import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, levelOverrides, ratings } from "@repo/db";

import { levelSetterProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import {
  bandFromLevel,
  confirmedPhiForOverride,
  formatLevel,
  initialRatingFromChoice,
  levelFromMu,
  muFromLevel,
} from "@repo/domain/level";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function isGroupMember(
  database: DbClient,
  groupId: string,
  userId: string,
) {
  const row = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

/**
 * A Level setter sets a Group member's Level. The set Level is a new Glicko-2
 * baseline: μ from the chosen Level, φ lowered to at most the override
 * ceiling so the Rating is confirmed, σ and `last_rated_at` kept. Every set
 * appends a `level_overrides` row; nothing reads its before-values back.
 */
export async function setMemberLevel(
  database: DbClient,
  args: {
    groupId: string;
    setterUserId: string;
    targetUserId: string;
    levelTenths: number;
    reason?: LevelOverrideReason | null;
  },
) {
  if (
    !Number.isInteger(args.levelTenths) ||
    args.levelTenths < LEVEL_TENTHS_MIN ||
    args.levelTenths > LEVEL_TENTHS_MAX
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Level must be between 0.0 and 7.0",
    });
  }

  const group = await requireGroup(database, args.groupId);
  const sport = group.sport;
  if (!sport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Group has no sport, so it has no Levels",
    });
  }
  if (!(await isGroupMember(database, group.id, args.setterUserId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Group members can set a Level",
    });
  }
  if (args.targetUserId === args.setterUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot set your own Level",
    });
  }
  if (!(await isGroupMember(database, group.id, args.targetUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That User is not a member of this Group",
    });
  }

  const level = args.levelTenths / 10;

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
        groupId: group.id,
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

export const setLevel = levelSetterProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      levelTenths: z.number().int().min(LEVEL_TENTHS_MIN).max(LEVEL_TENTHS_MAX),
      reason: z.enum(LEVEL_OVERRIDE_REASONS).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMemberLevel(ctx.db, {
      groupId: input.groupId,
      setterUserId: appUser.id,
      targetUserId: input.userId,
      levelTenths: input.levelTenths,
      reason: input.reason,
    });
  });
