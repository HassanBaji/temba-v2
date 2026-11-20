import { TRPCError } from "@trpc/server";
import { and, eq, isNull, lt } from "drizzle-orm";
import { z } from "zod";

import { games, liveBoards, liveBoardTvs } from "@repo/db";
import {
  LIVE_BOARD_TV_NAME_MAX,
  parseBoardCode,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import { createOpaqueToken } from "#src/invites/tokens";
import {
  isBoardOpenForGame,
  LIVE_BOARD_TV_SEEN_WITHIN_MS,
} from "#src/live-boards/boards";
import { publicProcedure } from "#src/trpc";

/**
 * Eight TVs asking every five seconds stay inside the signed-out request
 * limit of one venue address, with room for the people on its Wi-Fi.
 */
const LIVE_BOARD_TV_MAX = 8;

/**
 * A TV joining a board with its Board code, signed out. It gets a token of
 * its own, so the Organizer can disconnect that one TV, and a wrong or
 * retired code reads the same as no board. TVs that went quiet give up
 * their place first, so the rows of a board never outgrow its TVs.
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
  const boardId = row.board.id;
  const named = (args.name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIVE_BOARD_TV_NAME_MAX);

  return database.transaction(async (tx) => {
    // Two TVs joining at once must not both take the last place.
    await tx
      .select({ id: liveBoards.id })
      .from(liveBoards)
      .where(eq(liveBoards.id, boardId))
      .for("update");
    await tx
      .delete(liveBoardTvs)
      .where(
        and(
          eq(liveBoardTvs.boardId, boardId),
          isNull(liveBoardTvs.disconnectedAt),
          lt(
            liveBoardTvs.lastSeenAt,
            new Date(now.getTime() - LIVE_BOARD_TV_SEEN_WITHIN_MS),
          ),
        ),
      );
    const present = await tx
      .select({ name: liveBoardTvs.name })
      .from(liveBoardTvs)
      .where(
        and(
          eq(liveBoardTvs.boardId, boardId),
          isNull(liveBoardTvs.disconnectedAt),
        ),
      );
    if (present.length >= LIVE_BOARD_TV_MAX) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: m.tv.failed });
    }
    const taken = new Set(present.map((tv) => tv.name));
    let number = present.length + 1;
    while (taken.has(m.tv.defaultName(number))) {
      number += 1;
    }
    const token = createOpaqueToken();
    await tx.insert(liveBoardTvs).values({
      boardId,
      name: named || m.tv.defaultName(number),
      token,
      connectedAt: now,
      lastSeenAt: now,
    });
    return { token };
  });
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
