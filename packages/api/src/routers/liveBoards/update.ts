import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import {
  changeBoardRotation,
  LIVE_BOARD_COLOR_SCHEMES,
  LIVE_BOARD_ROTATE_SECONDS,
  LIVE_BOARD_SCREENS,
  liveBoardKind,
  type BoardRotationChange,
  type LiveBoardColorScheme,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { liveBoardStatus } from "#src/live-boards/board-content";
import { requireManagedBoard } from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/**
 * The board control's settings (`changeBoardRotation` says what each does to
 * the rotation). Only what a call changes is written, so two Organizers
 * changing different settings at once both keep theirs.
 */
export async function updateLiveBoard(
  database: typeof db,
  args: BoardRotationChange & {
    gameId: string;
    userId: string;
    colorScheme?: LiveBoardColorScheme;
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
  const change: BoardRotationChange = {
    rotate: args.rotate,
    rotateSeconds: args.rotateSeconds,
    heldScreen: args.heldScreen,
  };
  const changesRotation = Object.values(change).some(
    (value) => value !== undefined,
  );
  if (changesRotation && liveBoardKind(game) !== "social") {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.noScreens });
  }
  if (
    args.rotateSeconds !== undefined &&
    !LIVE_BOARD_ROTATE_SECONDS.some((seconds) => seconds === args.rotateSeconds)
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.rotateSeconds });
  }
  // Switching rotation off holds the screen the room is looking at, so it
  // must skip the screens with nothing to show, as the TVs do.
  const screens =
    args.rotate === false && board.rotate
      ? (await liveBoardStatus(database, game, now, locale))?.screens
      : undefined;
  const rotation = changeBoardRotation(board, change, now, screens);

  await database
    .update(liveBoards)
    .set({
      updatedAt: now,
      ...rotation,
      ...(args.colorScheme && { colorScheme: args.colorScheme }),
      ...(args.showQr !== undefined && { showQr: args.showQr }),
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
      colorScheme: z.enum(LIVE_BOARD_COLOR_SCHEMES).optional(),
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
