import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";

import { games, liveBoardTvs } from "@repo/db";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { liveBoardContent } from "#src/live-boards/board-content";
import {
  boardSettings,
  isBoardOpenForGame,
  LIVE_BOARD_TV_SEEN_WITHIN_MS,
} from "#src/live-boards/boards";
import { publicProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The page the board's QR opens: the Game, and its results once it ends. */
function liveBoardFollowUrl(origin: string, gameId: string) {
  return `${origin}/dashboard/games/${gameId}`;
}

/** How stale a TV's last-seen time may get before a read writes it again. */
const TV_SEEN_WRITE_EVERY_MS = LIVE_BOARD_TV_SEEN_WITHIN_MS / 3;

/**
 * What one TV draws, read every few seconds with the token it was given.
 * View only: names, Level bands and scores, never a phone number. A board
 * that was stopped, closed or taken off this TV says so and sends nothing
 * else. Reading also marks the TV as still there; a token that went quiet
 * has expired, and its TV joins again with the code.
 */
export async function liveBoardSnapshot(
  database: DbClient,
  args: { token: string; origin: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const tv = await database.query.liveBoardTvs.findFirst({
    where: eq(liveBoardTvs.token, args.token),
    with: { board: true },
  });
  if (!tv) {
    return { status: "expired" as const };
  }
  if (tv.disconnectedAt) {
    return { status: "disconnected" as const };
  }
  if (tv.board.stoppedAt) {
    return { status: "stopped" as const };
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, tv.board.gameId),
    with: {
      group: { columns: { name: true } },
      venue: { columns: { name: true } },
    },
  });
  const content =
    game && isBoardOpenForGame(tv.board, game, now)
      ? await liveBoardContent(database, game, now, locale)
      : null;
  if (!game || !content) {
    return { status: "closed" as const };
  }
  if (now.getTime() - tv.lastSeenAt.getTime() > LIVE_BOARD_TV_SEEN_WITHIN_MS) {
    await database.delete(liveBoardTvs).where(eq(liveBoardTvs.id, tv.id));
    return { status: "expired" as const };
  }

  await database
    .update(liveBoardTvs)
    .set({ lastSeenAt: now })
    .where(
      and(
        eq(liveBoardTvs.id, tv.id),
        lt(
          liveBoardTvs.lastSeenAt,
          new Date(now.getTime() - TV_SEEN_WRITE_EVERY_MS),
        ),
      ),
    );

  const { board } = tv;
  return {
    status: "live" as const,
    serverNow: now,
    game: {
      name: gameDisplayName(game, locale),
      groupName: game.group?.name ?? null,
      venueName: game.venue.name,
      sport: game.sport,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      followUrl: liveBoardFollowUrl(args.origin, game.id),
    },
    settings: {
      ...boardSettings(board),
      message: board.messageShown ? board.message : null,
    },
    content,
  };
}

export const snapshotProcedure = publicProcedure
  .input(z.object({ token: z.string().min(16).max(64) }))
  .query(({ ctx, input }) =>
    liveBoardSnapshot(ctx.db, {
      token: input.token,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    }),
  );
