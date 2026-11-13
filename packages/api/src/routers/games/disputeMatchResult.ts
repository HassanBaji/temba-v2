import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  MATCH_DISPUTE_NOTE_MAX_LENGTH,
  matchDisputes,
  matches,
  user,
} from "@repo/db";

import { MATCH_DISPUTE_DAYS } from "@repo/domain/match-dispute";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  matchDisputeRefusal,
  type MatchDisputeRefusal,
} from "#src/games/match-dispute";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function refusalError(refusal: MatchDisputeRefusal, locale: Locale) {
  const errors = messagesFor(locale).rating.dispute.errors;
  switch (refusal) {
    case "not_counted":
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: errors.notCounted,
      });
    case "not_seated":
      return new TRPCError({ code: "FORBIDDEN", message: errors.notSeated });
    case "not_completed":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: errors.notCompleted,
      });
    case "too_late":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: errors.tooLate(MATCH_DISPUTE_DAYS),
      });
    case "already_open":
      return new TRPCError({ code: "CONFLICT", message: errors.alreadyOpen });
  }
}

/**
 * A seated player says a Match that counted for Temba Level is wrong. The
 * dispute waits for an Operator, and every Operator is told, found through
 * `user.is_operator` (ADR-0075). One open dispute per Match; the partial
 * unique index settles two players racing.
 */
export async function disputeMatchResult(
  database: DbClient,
  args: {
    matchId: string;
    userId: string;
    note: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const note = args.note.trim();
  if (note.length === 0 || note.length > MATCH_DISPUTE_NOTE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).rating.dispute.errors.note,
    });
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, args.matchId),
  });
  if (!match) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  const game = await requireGame(database, match.gameId, locale);

  return database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).game.errors.matchNotFound,
      });
    }
    const refusal = await matchDisputeRefusal(tx, {
      game,
      match: locked,
      userId: args.userId,
      now,
    });
    if (refusal) {
      throw refusalError(refusal, locale);
    }
    const [dispute] = await tx
      .insert(matchDisputes)
      .values({
        matchId: locked.id,
        raisedByUserId: args.userId,
        note,
        createdAt: now,
      })
      .returning({ id: matchDisputes.id });
    if (!dispute) {
      throw new Error("Failed to write the Match dispute");
    }
    const operators = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.isOperator, true));
    await notify(tx, {
      type: "match_dispute_raised",
      recipients: operators.map((operator) => ({
        userId: operator.id,
        audience: "admin" as const,
      })),
      excludeUserIds: [args.userId],
      actorUserId: args.userId,
      gameId: game.id,
      matchDisputeId: dispute.id,
    });
    return { disputeId: dispute.id };
  });
}

export const disputeMatchResultProcedure = protectedProcedure
  .input(
    z.object({
      matchId: z.string().uuid(),
      note: z.string().trim().min(1).max(MATCH_DISPUTE_NOTE_MAX_LENGTH),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return disputeMatchResult(ctx.db, {
      matchId: input.matchId,
      userId: appUser.id,
      note: input.note,
      locale: ctx.locale,
    });
  });
