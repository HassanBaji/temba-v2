import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { games, liveBoards, liveBoardTvs } from "@repo/db";
import {
  LIVE_BOARD_TV_NAME_MAX,
  parseBoardCode,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import {
  connectedTvs,
  isBoardOpenForGame,
  LIVE_BOARD_TV_MAX,
} from "#src/live-boards/boards";
import { createOpaqueToken } from "#src/invites/tokens";
import { publicProcedure } from "#src/trpc";

/**
 * A TV joining a board with its Board code, signed out. It gets a token of
 * its own, so the Organizer can disconnect that one screen, and a wrong or
 * retired code reads the same as no board.
 */
export async function connectLiveBoardTv(
  database: typeof db,
  args: { code: string; name?: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const m = messagesFor(locale).liveBoard;
  const notFound = new TRPCError({
    code: "NOT_FOUND",
    message: m.tv.notFound,
  });

  const code = parseBoardCode(args.code);
  if (!code) {
    throw notFound;
  }
  const [row] = await database
    .select({ board: liveBoards, game: games })
    .from(liveBoards)
    .innerJoin(games, eq(games.id, liveBoards.gameId))
    .where(and(eq(liveBoards.code, code), isNull(liveBoards.stoppedAt)));
  if (!row || !isBoardOpenForGame(row.board, row.game, now)) {
    throw notFound;
  }
  if (
    (await connectedTvs(database, row.board.id, now)).length >=
    LIVE_BOARD_TV_MAX
  ) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: m.tv.failed });
  }

  const [joined] = await database
    .select({ value: count() })
    .from(liveBoardTvs)
    .where(eq(liveBoardTvs.boardId, row.board.id));
  const name =
    (args.name ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, LIVE_BOARD_TV_NAME_MAX) ||
    m.tv.defaultName((joined?.value ?? 0) + 1);
  const token = createOpaqueToken();
  await database.insert(liveBoardTvs).values({
    boardId: row.board.id,
    name,
    token,
    connectedAt: now,
    lastSeenAt: now,
  });
  return { token };
}

export const connectProcedure = publicProcedure
  .input(
    z.object({
      code: z.string().min(1).max(32),
      name: z.string().max(120).optional(),
    }),
  )
  .mutation(({ ctx, input }) =>
    connectLiveBoardTv(ctx.db, { ...input, locale: ctx.locale }),
  );
