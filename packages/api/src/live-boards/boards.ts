import { randomInt } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

import { liveBoards, liveBoardTvs } from "@repo/db";
import {
  isLiveBoardOpen,
  LIVE_BOARD_CODE_LENGTH,
  liveBoardKind,
  type LiveBoardKind,
} from "@repo/domain/live-board";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LiveBoardRow = typeof liveBoards.$inferSelect;

/** A TV that has not asked for the board this long is no longer listed. */
export const LIVE_BOARD_TV_SEEN_WITHIN_MS = 45_000;

export const LIVE_BOARD_TV_MAX = 12;

export function createBoardCode() {
  return String(randomInt(0, 10 ** LIVE_BOARD_CODE_LENGTH)).padStart(
    LIVE_BOARD_CODE_LENGTH,
    "0",
  );
}

const LIVE_BOARD_ENTRY_PATH = "/tv";

export function liveBoardUrl(origin: string, code: string) {
  return `${origin}${LIVE_BOARD_ENTRY_PATH}/${code}`;
}

/** "temba.app/tv": the address an Organizer reads out, without the scheme. */
export function liveBoardAddress(origin: string) {
  return `${origin.replace(/^https?:\/\//, "").replace(/\/+$/, "")}${LIVE_BOARD_ENTRY_PATH}`;
}

/** The page the board's QR opens: the Game, and its results once it ends. */
export function liveBoardFollowUrl(origin: string, gameId: string) {
  return `${origin}/dashboard/games/${gameId}`;
}

export function isBoardOpenForGame(
  board: Pick<LiveBoardRow, "stoppedAt">,
  game: Pick<GameRow, "cancelledAt" | "windowEnd">,
  now: Date,
) {
  return isLiveBoardOpen(
    {
      stoppedAt: board.stoppedAt,
      gameCancelledAt: game.cancelledAt,
      windowEnd: game.windowEnd,
    },
    now,
  );
}

/** Whether a board may be started for this Game at all, and of which kind. */
export function startableBoardKind(
  game: GameRow,
  now: Date,
): LiveBoardKind | null {
  const kind = liveBoardKind(game);
  return kind && isBoardOpenForGame({ stoppedAt: null }, game, now)
    ? kind
    : null;
}

export async function findRunningBoard(
  database: DbClient,
  game: GameRow,
  now: Date,
): Promise<LiveBoardRow | null> {
  const board = await database.query.liveBoards.findFirst({
    where: and(eq(liveBoards.gameId, game.id), isNull(liveBoards.stoppedAt)),
  });
  return board && isBoardOpenForGame(board, game, now) ? board : null;
}

/** The running board of a Game the caller organizes, for the control's doors. */
export async function requireManagedBoard(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale; now: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  const board = await findRunningBoard(database, game, args.now);
  if (!board) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).liveBoard.errors.notFound,
    });
  }
  return { game, board };
}

export async function connectedTvs(
  database: DbClient,
  boardId: string,
  now: Date,
) {
  return database.query.liveBoardTvs.findMany({
    where: and(
      eq(liveBoardTvs.boardId, boardId),
      isNull(liveBoardTvs.disconnectedAt),
      gt(
        liveBoardTvs.lastSeenAt,
        new Date(now.getTime() - LIVE_BOARD_TV_SEEN_WITHIN_MS),
      ),
    ),
    columns: { id: true, name: true, connectedAt: true },
    orderBy: [asc(liveBoardTvs.connectedAt), asc(liveBoardTvs.id)],
  });
}

/** What the Show on TV sheet, the On TV card and the board control read. */
export async function liveBoardControl(
  database: DbClient,
  args: { board: LiveBoardRow; origin: string; now: Date },
) {
  const { board } = args;
  return {
    id: board.id,
    code: board.code,
    url: liveBoardUrl(args.origin, board.code),
    address: liveBoardAddress(args.origin),
    rotate: board.rotate,
    rotateSeconds: board.rotateSeconds,
    heldScreen: board.heldScreen,
    rotationStartedAt: board.rotationStartedAt,
    theme: board.theme,
    showQr: board.showQr,
    message: board.message,
    messageShown: board.messageShown,
    tvs: await connectedTvs(database, board.id, args.now),
    serverNow: args.now,
  };
}

export type LiveBoardControl = Awaited<ReturnType<typeof liveBoardControl>>;
