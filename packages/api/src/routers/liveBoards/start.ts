import { randomInt } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import { LIVE_BOARD_CODE_LENGTH, liveBoardKind } from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  findRunningBoard,
  liveBoardControl,
  startableBoardKind,
} from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

const BOARD_CODE_ATTEMPTS = 8;

function createBoardCode() {
  return String(randomInt(0, 10 ** LIVE_BOARD_CODE_LENGTH)).padStart(
    LIVE_BOARD_CODE_LENGTH,
    "0",
  );
}

/**
 * Show on TV: starts the Game's Live board and mints its Board code. A Game
 * has one running board, so a second Organizer gets the board already on.
 */
export async function startLiveBoard(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    origin: string;
    locale?: Locale;
    now?: Date;
    createCode?: () => string;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const m = messagesFor(locale).liveBoard.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (!liveBoardKind(game)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.unavailable });
  }
  if (!startableBoardKind(game, now)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.closed });
  }

  const createCode = args.createCode ?? createBoardCode;
  for (let attempt = 0; attempt < BOARD_CODE_ATTEMPTS; attempt += 1) {
    const running = await findRunningBoard(database, game, now);
    if (running) {
      return liveBoardControl(database, {
        board: running,
        game,
        origin: args.origin,
        now,
        locale,
      });
    }
    try {
      const [board] = await database
        .insert(liveBoards)
        .values({
          gameId: game.id,
          code: createCode(),
          createdBy: args.userId,
          rotationStartedAt: now,
        })
        .returning();
      if (board) {
        return liveBoardControl(database, {
          board,
          game,
          origin: args.origin,
          now,
          locale,
        });
      }
    } catch (error) {
      // The code is taken by another running board, or another Organizer
      // started this Game's board first: the next pass tells which.
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: m.codesExhausted });
}

export const startProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return startLiveBoard(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    });
  });
