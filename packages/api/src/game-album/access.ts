import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { MatchStatusEnum, gamePlayers, matches, user } from "@repo/db";
import {
  gameNotesCloseAt,
  type GameAlbumPerson,
} from "@repo/domain/game-album";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import {
  canViewGame,
  isGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";
import { notUnclaimedUserSql } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AlbumAccess = {
  game: GameRow;
  /** Not cancelled, with a final score on at least one Match. */
  played: boolean;
  isPlayer: boolean;
  isOrganizer: boolean;
  /** Account holders on the roster, the viewer included. */
  players: GameAlbumPerson[];
  notesCloseAt: Date;
};

/** The roster's account holders: who adds photos, writes notes and reads public ones. */
async function albumPlayers(
  database: DbClient,
  gameId: string,
): Promise<GameAlbumPerson[]> {
  const rows = await database
    .select({ userId: user.id, name: user.name, image: user.image })
    .from(gamePlayers)
    .innerJoin(user, eq(user.id, gamePlayers.userId))
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        isNotNull(gamePlayers.userId),
        notUnclaimedUserSql,
      ),
    )
    .orderBy(gamePlayers.createdAt);
  return rows.map((row) => ({
    userId: row.userId,
    name: row.name ?? "",
    image: row.image ?? null,
  }));
}

async function hasFinalScore(database: DbClient, gameId: string) {
  const completed = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.status, MatchStatusEnum.COMPLETED),
    ),
    columns: { id: true },
  });
  return completed != null;
}

/**
 * Who may do what with a Game's Album and Notes. Nothing opens until a score
 * is final: a window that ran out without one does not count. Anyone who may open the
 * Game gets an answer; only its players and Organizers see the sections.
 */
export async function albumAccess(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
): Promise<AlbumAccess> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  const [scored, players, isOrganizer] = await Promise.all([
    hasFinalScore(database, game.id),
    albumPlayers(database, game.id),
    isGameOrganizer(database, game, args.userId),
  ]);
  return {
    game,
    played: game.cancelledAt == null && scored,
    isPlayer: players.some((player) => player.userId === args.userId),
    isOrganizer,
    players,
    notesCloseAt: gameNotesCloseAt(
      game.windowEnd ?? game.windowStart ?? game.createdAt,
    ),
  };
}

/** Adding photos and writing notes: a player, on a played Game. */
export function assertMayContribute(
  access: AlbumAccess,
  locale: Locale = DEFAULT_LOCALE,
) {
  const errors = messagesFor(locale).gameAlbum.errors;
  if (!access.played) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.notPlayed });
  }
  if (!access.isPlayer) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.notPlayer });
  }
}

export function notesAreOpen(access: AlbumAccess, now: Date) {
  return now.getTime() < access.notesCloseAt.getTime();
}
