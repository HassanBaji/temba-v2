import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchDisputes, matches } from "@repo/db";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { operatorProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { gameAdminUserIds, requireGame } from "#src/games/access";
import { notify } from "#src/notifications/notify";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * An Operator decides an open Match dispute. Upholding runs the wrong-score
 * reversal as the Operator and returns the Match to `pending`: a football
 * Match's OVR and Tier events are subtracted, and a padel Match follows the
 * reversal's eligibility rule, so a later Rated Match refuses with its reason
 * and the dispute stays open. Dismissing leaves the result as it is. Either
 * way the player and the Game's Organizers are told.
 */
export async function decideDispute(
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
  const errors = messagesFor(locale).rating.dispute.errors;

  return database.transaction(async (tx) => {
    const [dispute] = await tx
      .select()
      .from(matchDisputes)
      .where(eq(matchDisputes.id, args.disputeId))
      .for("update");
    if (!dispute) {
      throw new TRPCError({ code: "NOT_FOUND", message: errors.notFound });
    }
    if (dispute.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.decided });
    }
    const match = await tx.query.matches.findFirst({
      where: eq(matches.id, dispute.matchId),
    });
    if (!match) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).game.errors.matchNotFound,
      });
    }
    const game = await requireGame(tx, match.gameId, locale);

    if (args.upheld) {
      if (match.status !== MatchStatusEnum.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: messagesFor(locale).rating.dispute.operator.notCompleted,
        });
      }
      await reportWrongScore(tx, {
        gameId: game.id,
        matchId: match.id,
        userId: args.operatorUserId,
        locale,
        asOperator: true,
      });
    }

    await tx
      .update(matchDisputes)
      .set({
        status: args.upheld ? "upheld" : "dismissed",
        decidedByUserId: args.operatorUserId,
        decidedAt: now,
      })
      .where(eq(matchDisputes.id, dispute.id));

    const organizerIds = await gameAdminUserIds(tx, game);
    await notify(tx, {
      type: "match_dispute_decided",
      recipients: [
        { userId: dispute.raisedByUserId, audience: "player" },
        ...organizerIds.map((userId) => ({
          userId,
          audience: "admin" as const,
        })),
      ],
      excludeUserIds: [args.operatorUserId],
      actorUserId: dispute.raisedByUserId,
      gameId: game.id,
      matchDisputeId: dispute.id,
    });

    return {
      disputeId: dispute.id,
      status: args.upheld ? ("upheld" as const) : ("dismissed" as const),
    };
  });
}

export const decideDisputeProcedure = operatorProcedure
  .input(z.object({ disputeId: z.string().uuid(), upheld: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return decideDispute(ctx.db, {
      disputeId: input.disputeId,
      upheld: input.upheld,
      operatorUserId: operator.id,
      locale: ctx.locale,
    });
  });
