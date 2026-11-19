import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import {
  LIVE_BOARD_MESSAGE_MAX,
  normalizeBoardMessage,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireManagedBoard } from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/**
 * The one line an Organizer puts across the bottom of the board. Saving the
 * text and showing it are separate: it stays up until it is taken down, and
 * an emptied message comes down with it.
 */
export async function setLiveBoardMessage(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    message?: string;
    shown?: boolean;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const m = messagesFor(locale).liveBoard;
  const { board } = await requireManagedBoard(database, {
    gameId: args.gameId,
    userId: args.userId,
    locale,
    now,
  });

  if (
    args.message !== undefined &&
    args.message.trim().length > LIVE_BOARD_MESSAGE_MAX
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.errors.messageTooLong(LIVE_BOARD_MESSAGE_MAX),
    });
  }
  const message =
    args.message === undefined
      ? board.message
      : normalizeBoardMessage(args.message);
  const shown = message == null ? false : (args.shown ?? board.messageShown);
  if (args.shown && message == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.control.messageEmpty,
    });
  }

  await database
    .update(liveBoards)
    .set({ message, messageShown: shown, updatedAt: now })
    .where(eq(liveBoards.id, board.id));
  return { ok: true as const };
}

export const setMessageProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      message: z.string().max(500).optional(),
      shown: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setLiveBoardMessage(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
