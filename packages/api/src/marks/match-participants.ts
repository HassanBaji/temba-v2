import { and, asc, eq, inArray, ne } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeams,
  matchGoals,
  matches,
  user,
} from "@repo/db";

import {
  DEFAULT_FOOTBALL_BIBS,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import type { MatchSlot } from "@repo/domain/marks";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import { matchSideSeats } from "#src/games/match-result-confirmations";
import { type MatchRow } from "#src/games/utils";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MatchParticipant = {
  userId: string;
  name: string;
  image: string | null;
  slot: MatchSlot;
  bib: FootballBib | null;
  isUnclaimed: boolean;
  goals: number | null;
  keeper: boolean;
};

/**
 * The Match a Game's Marks hang off. Only a Friendly game carries Marks in
 * v1, and it has exactly one Match; tournaments, Americano and cancelled
 * Games have none.
 */
export async function marksMatch(
  database: DbClient,
  game: Pick<GameRow, "id" | "format" | "cancelledAt">,
): Promise<MatchRow | null> {
  if (game.format !== "friendly_game" || game.cancelledAt) {
    return null;
  }
  return (
    (await database.query.matches.findFirst({
      where: and(
        eq(matches.gameId, game.id),
        ne(matches.status, MatchStatusEnum.CANCELLED),
      ),
      orderBy: asc(matches.createdAt),
    })) ?? null
  );
}

/**
 * The Users seated on a Match's two Game teams: who may give and receive
 * Marks, which side each is on, and the football hints (Bib, goals, keeper).
 * Roster members not placed on a side are not participants.
 */
export async function loadMatchParticipants(
  database: DbClient,
  match: MatchRow,
  game: Pick<GameRow, "id" | "sport">,
): Promise<MatchParticipant[]> {
  const sides = await matchSideSeats(database, match);
  const slotByUser = new Map<string, MatchSlot>();
  for (const side of sides) {
    for (const userId of side.userIds) {
      slotByUser.set(userId, side.slot);
    }
  }
  const userIds = [...slotByUser.keys()];
  if (userIds.length === 0) {
    return [];
  }

  const football = isFootballGame(game);
  const [users, footballSeats, goals, teams] = await Promise.all([
    database.query.user.findMany({
      where: inArray(user.id, userIds),
      columns: {
        id: true,
        name: true,
        image: true,
        clerkId: true,
        addedAt: true,
        guestAt: true,
      },
    }),
    football
      ? database.query.gamePlayers.findMany({
          where: and(
            eq(gamePlayers.gameId, game.id),
            inArray(gamePlayers.userId, userIds),
          ),
          columns: { userId: true, footballRole: true },
        })
      : Promise.resolve([]),
    football
      ? database.query.matchGoals.findMany({
          where: eq(matchGoals.matchId, match.id),
          columns: { userId: true, goals: true },
        })
      : Promise.resolve([]),
    football
      ? database.query.gameTeams.findMany({
          where: eq(gameTeams.gameId, game.id),
          columns: { id: true, bib: true },
        })
      : Promise.resolve([]),
  ]);

  const keepers = new Set(
    footballSeats.flatMap((seat) =>
      seat.userId && seat.footballRole === "keeper" ? [seat.userId] : [],
    ),
  );
  const goalsByUser = new Map(goals.map((row) => [row.userId, row.goals]));
  const bibOf = (slot: MatchSlot): FootballBib | null => {
    if (!football) {
      return null;
    }
    const gameTeamId =
      slot === 1 ? match.slot1GameTeamId : match.slot2GameTeamId;
    const bib = teams.find((team) => team.id === gameTeamId)?.bib;
    return (
      bib ??
      (slot === 1 ? DEFAULT_FOOTBALL_BIBS.slot1 : DEFAULT_FOOTBALL_BIBS.slot2)
    );
  };

  return users
    .flatMap((row) => {
      const slot = slotByUser.get(row.id);
      // A Guest player gives and receives no Marks and is never MVP (ADR-0079).
      if (!slot || row.guestAt) {
        return [];
      }
      return [
        {
          userId: row.id,
          name: row.name,
          image: row.image,
          slot,
          bib: bibOf(slot),
          isUnclaimed: isUnclaimed(row),
          goals: football ? (goalsByUser.get(row.id) ?? 0) : null,
          keeper: keepers.has(row.id),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.slot - right.slot || left.name.localeCompare(right.name),
    );
}
