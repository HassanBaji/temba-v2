import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import {
  changeRoundClock,
  ROUND_CLOCK_ACTIONS,
  type RoundClockAction,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { liveBoardStatus } from "#src/live-boards/board-content";
import {
  boardRoundClockOf,
  requireManagedBoard,
} from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/**
 * The Organizer runs a Social board's Round clock: starts the Round on
 * court, pauses and resumes it, or hands the clock back to the schedule
 * (`changeRoundClock` says what each does). It moves the board only: Match
 * times and scores are not touched. `roundNumber` is the Round the control
 * was showing, so a tap that arrives after the board moved on starts nothing.
 */
export async function setLiveBoardRoundClock(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    action: RoundClockAction;
    roundNumber?: number;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const m = messagesFor(locale).liveBoard.errors;
  const { game, board } = await requireManagedBoard(database, {
    gameId: args.gameId,
    userId: args.userId,
    locale,
    now,
  });
  const round = (await liveBoardStatus(database, game, now, locale))?.round;
  if (!round) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.noRoundClock });
  }
  if (
    args.roundNumber !== undefined &&
    args.roundNumber !== round.roundNumber
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: m.roundMovedOn(round.roundNumber),
    });
  }
  const clock = changeRoundClock(
    boardRoundClockOf(board),
    args.action,
    round,
    now,
  );
  if (clock) {
    await database
      .update(liveBoards)
      .set({
        updatedAt: now,
        roundClockByHand: clock.byHand,
        roundClockRound: clock.roundNumber,
        roundClockStartedAt: clock.startedAt,
        roundClockRunningSince: clock.runningSince,
        roundClockElapsedMs: clock.elapsedMs,
      })
      .where(eq(liveBoards.id, board.id));
  }
  return { ok: true as const };
}

export const setRoundClockProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      action: z.enum(ROUND_CLOCK_ACTIONS),
      roundNumber: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setLiveBoardRoundClock(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
