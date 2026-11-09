import type { DbClient, DbTx } from "@repo/db";
import { and, asc, eq, ne } from "drizzle-orm";

import { MatchStatusEnum, gameTeams, matches } from "@repo/db";
import { isFootballGame } from "@repo/domain/game-shape";
import { squadState, type SquadState } from "@repo/domain/matchday-squad";

import type { GameRow } from "#src/games/access";

type DbOrTx = DbClient | DbTx;

const PADEL_SIDE_SIZE = 2;

export type ChallengeSide = {
  gameTeamId: string;
  sideIndex: number;
  teamId: string | null;
  bib: string | null;
  sideSize: number;
  named: {
    userId: string;
    name: string;
    image: string | null;
    footballRole: "outfield" | "keeper" | null;
    footballPosition: "def" | "mid" | "fwd" | null;
  }[];
  squadState: SquadState;
};

/**
 * Both sides of a Challenge Game, side 1 first: the Team each is bound to,
 * the players named to it in naming order, and its squad state. A side locks
 * once the Score is entered or the Match is completed. Null on any other Game.
 */
export async function loadChallengeSides(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "sport" | "sideSize" | "challengeId">,
): Promise<ChallengeSide[] | null> {
  if (!game.challengeId) {
    return null;
  }
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    columns: { id: true, sideIndex: true, teamId: true, bib: true },
    with: {
      players: {
        columns: { createdAt: true },
        with: {
          gamePlayer: {
            columns: { footballRole: true, footballPosition: true },
            with: { user: { columns: { id: true, name: true, image: true } } },
          },
        },
        orderBy: (table) => [asc(table.createdAt), asc(table.id)],
      },
    },
    orderBy: (table) => [asc(table.sideIndex), asc(table.createdAt)],
  });
  const match = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, game.id),
      ne(matches.status, MatchStatusEnum.CANCELLED),
    ),
    columns: { status: true },
    with: {
      sets: { columns: { slot1GamesWon: true, slot2GamesWon: true } },
    },
    orderBy: asc(matches.createdAt),
  });
  const locked =
    match?.status === MatchStatusEnum.COMPLETED ||
    (match?.sets.some(
      (set) => set.slot1GamesWon != null && set.slot2GamesWon != null,
    ) ??
      false);
  const sideSize = isFootballGame(game)
    ? (game.sideSize ?? 0)
    : PADEL_SIDE_SIZE;

  return rows.map((row, index) => {
    const named = row.players.flatMap((link) => {
      const user = link.gamePlayer.user;
      return user
        ? [
            {
              userId: user.id,
              name: user.name,
              image: user.image,
              footballRole: link.gamePlayer.footballRole,
              footballPosition: link.gamePlayer.footballPosition,
            },
          ]
        : [];
    });
    return {
      gameTeamId: row.id,
      sideIndex: row.sideIndex ?? index + 1,
      teamId: row.teamId,
      bib: row.bib,
      sideSize,
      named,
      squadState: squadState(named.length, sideSize, { locked }),
    };
  });
}
