import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { levelDisputes, levelOverrides, ratings } from "@repo/db";

import { levelFromMu } from "@repo/domain/level";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { operatorProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import { applyLevelOverride } from "#src/ratings/apply-level-override";
import { latestOverrideId } from "#src/ratings/level-dispute";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function clampLevel(level: number) {
  return Math.min(
    LEVEL_TENTHS_MAX / 10,
    Math.max(LEVEL_TENTHS_MIN / 10, level),
  );
}

/**
 * An Operator decides an open Level dispute. Upholding takes the disputed
 * override's move back with a new Level override in the Operator's name, so
 * what Rated Matches moved since stays; it refuses once the Level was set by
 * hand again. Dismissing leaves the Level as it is. Either way the player is
 * told, without the setter's name (ADR-0097).
 */
export async function decideLevelDispute(
  database: DbClient,
  args: {
    disputeId: string;
    upheld: boolean;
    operatorUserId: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const errors = messagesFor(locale).rating.levelDispute.errors;

  return database.transaction(async (tx) => {
    const [dispute] = await tx
      .select()
      .from(levelDisputes)
      .where(eq(levelDisputes.id, args.disputeId))
      .for("update");
    if (!dispute) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: errors.disputeNotFound,
      });
    }
    if (dispute.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.decided });
    }
    const override = await tx.query.levelOverrides.findFirst({
      where: eq(levelOverrides.id, dispute.levelOverrideId),
    });
    if (!override) {
      throw new TRPCError({ code: "NOT_FOUND", message: errors.notFound });
    }

    let restoredOverrideId: string | null = null;
    if (args.upheld) {
      const latest = await latestOverrideId(
        tx,
        override.userId,
        override.sport,
      );
      if (latest !== override.id) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: errors.changedSince,
        });
      }
      const current = await tx.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, override.userId),
          eq(ratings.sport, override.sport),
        ),
        columns: { mu: true },
      });
      const currentMu = current?.mu ?? override.muAfter;
      const restoredMu = currentMu - (override.muAfter - override.muBefore);
      const restored = await applyLevelOverride(tx, {
        sport: override.sport,
        setterUserId: args.operatorUserId,
        setByRole: "operator",
        targetUserId: override.userId,
        groupId: null,
        level: clampLevel(levelFromMu(restoredMu)),
        reason: "correcting_a_mistake",
        locale,
      });
      restoredOverrideId = restored.overrideId;
    }

    const status = args.upheld ? ("upheld" as const) : ("dismissed" as const);
    await tx
      .update(levelDisputes)
      .set({
        status,
        decidedByUserId: args.operatorUserId,
        decidedAt: now,
        restoredOverrideId,
      })
      .where(eq(levelDisputes.id, dispute.id));

    await notify(tx, {
      type: "level_dispute_decided",
      recipients: [{ userId: dispute.raisedByUserId, audience: "player" }],
      excludeUserIds: [args.operatorUserId],
      actorUserId: args.operatorUserId,
      levelOverrideId: restoredOverrideId ?? override.id,
      levelDisputeId: dispute.id,
    });

    return { disputeId: dispute.id, status, restoredOverrideId };
  });
}

export const decideLevelDisputeProcedure = operatorProcedure
  .input(z.object({ disputeId: z.string().uuid(), upheld: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return decideLevelDispute(ctx.db, {
      disputeId: input.disputeId,
      upheld: input.upheld,
      operatorUserId: operator.id,
      locale: ctx.locale,
    });
  });
