import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  LEVEL_DISPUTE_NOTE_MAX_LENGTH,
  levelDisputes,
  levelOverrides,
  user,
} from "@repo/db";

import { LEVEL_DISPUTE_DAYS } from "@repo/domain/level-dispute";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  levelDisputeRefusal,
  type LevelDisputeRefusal,
} from "#src/ratings/level-dispute";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function refusalError(refusal: LevelDisputeRefusal, locale: Locale) {
  const errors = messagesFor(locale).rating.levelDispute.errors;
  switch (refusal) {
    case "not_yours":
      return new TRPCError({ code: "FORBIDDEN", message: errors.notYours });
    case "own_change":
      return new TRPCError({ code: "BAD_REQUEST", message: errors.ownChange });
    case "restored":
      return new TRPCError({ code: "BAD_REQUEST", message: errors.restored });
    case "superseded":
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: errors.superseded,
      });
    case "too_late":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: errors.tooLate(LEVEL_DISPUTE_DAYS),
      });
    case "already_disputed":
      return new TRPCError({
        code: "CONFLICT",
        message: errors.alreadyDisputed,
      });
  }
}

/**
 * A player says a Level override of theirs is wrong. The dispute waits for an
 * Operator, and every Operator is told, found through `user.is_operator`
 * (ADR-0081). The player never learns who set the Level (ADR-0097). One
 * dispute per override; the unique index settles a double tap.
 */
export async function disputeLevel(
  database: DbClient,
  args: {
    levelOverrideId: string;
    userId: string;
    note: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const errors = messagesFor(locale).rating.levelDispute.errors;
  const note = args.note.trim();
  if (note.length === 0 || note.length > LEVEL_DISPUTE_NOTE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.note });
  }

  return database.transaction(async (tx) => {
    const [override] = await tx
      .select()
      .from(levelOverrides)
      .where(eq(levelOverrides.id, args.levelOverrideId))
      .for("update");
    if (override?.userId !== args.userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: errors.notFound });
    }
    const refusal = await levelDisputeRefusal(tx, {
      override,
      userId: args.userId,
      now,
    });
    if (refusal) {
      throw refusalError(refusal, locale);
    }
    const [dispute] = await tx
      .insert(levelDisputes)
      .values({
        levelOverrideId: override.id,
        raisedByUserId: args.userId,
        note,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: levelDisputes.id });
    if (!dispute) {
      throw refusalError("already_disputed", locale);
    }
    const operators = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.isOperator, true));
    await notify(tx, {
      type: "level_dispute_raised",
      recipients: operators.map((operator) => ({
        userId: operator.id,
        audience: "admin" as const,
      })),
      excludeUserIds: [args.userId],
      actorUserId: args.userId,
      levelOverrideId: override.id,
      levelDisputeId: dispute.id,
    });
    return { disputeId: dispute.id };
  });
}

export const disputeLevelProcedure = protectedProcedure
  .input(
    z.object({
      levelOverrideId: z.string().uuid(),
      note: z.string().trim().min(1).max(LEVEL_DISPUTE_NOTE_MAX_LENGTH),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return disputeLevel(ctx.db, {
      levelOverrideId: input.levelOverrideId,
      userId: appUser.id,
      note: input.note,
      locale: ctx.locale,
    });
  });
