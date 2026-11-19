import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import {
  isRotateSeconds,
  LIVE_BOARD_SCREENS,
  LIVE_BOARD_THEMES,
  liveBoardKind,
  liveBoardScene,
  type LiveBoardScreen,
  type LiveBoardTheme,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireManagedBoard } from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/**
 * The board control's settings. Showing a Board screen holds the board on
 * it; turning rotation back on, or changing its pace, starts it again from
 * On court on every TV at once.
 */
export async function updateLiveBoard(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    rotate?: boolean;
    rotateSeconds?: number;
    heldScreen?: LiveBoardScreen;
    theme?: LiveBoardTheme;
    showQr?: boolean;
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

  const changesRotation =
    args.rotate !== undefined ||
    args.rotateSeconds !== undefined ||
    args.heldScreen !== undefined;
  if (changesRotation && liveBoardKind(game) !== "social") {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.noScreens });
  }
  if (
    args.rotateSeconds !== undefined &&
    !isRotateSeconds(args.rotateSeconds)
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.rotateSeconds });
  }

  const rotate = args.rotate ?? (args.heldScreen ? false : board.rotate);
  const heldScreen =
    args.heldScreen ??
    (args.rotate === false && board.rotate
      ? liveBoardScene(board, now).screen
      : board.heldScreen);

  await database
    .update(liveBoards)
    .set({
      rotate,
      heldScreen,
      rotateSeconds: args.rotateSeconds ?? board.rotateSeconds,
      rotationStartedAt: changesRotation ? now : board.rotationStartedAt,
      theme: args.theme ?? board.theme,
      showQr: args.showQr ?? board.showQr,
      updatedAt: now,
    })
    .where(eq(liveBoards.id, board.id));
  return { ok: true as const };
}

export const updateProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      rotate: z.boolean().optional(),
      rotateSeconds: z.number().int().optional(),
      heldScreen: z.enum(LIVE_BOARD_SCREENS).optional(),
      theme: z.enum(LIVE_BOARD_THEMES).optional(),
      showQr: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateLiveBoard(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
