import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { liveBoardKind } from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  findRunningBoard,
  liveBoardControl,
  startableBoardKind,
} from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A Game's Live board as its Organizer runs it: whether Show on TV is on
 * offer, and the running board with its settings and connected TVs. Everyone
 * else who can open the Game reads that there is nothing to manage.
 */
export async function liveBoardForGame(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    origin: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  const kind = liveBoardKind(game);
  if (!kind || !(await isGameOrganizer(database, game, args.userId))) {
    return { kind, canStart: false, board: null };
  }
  const board = await findRunningBoard(database, game, now);
  return {
    kind,
    canStart: startableBoardKind(game, now) != null,
    board: board
      ? await liveBoardControl(database, { board, origin: args.origin, now })
      : null,
  };
}

export const forGameProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return liveBoardForGame(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    });
  });
