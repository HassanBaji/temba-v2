import { and, eq, inArray } from "drizzle-orm";

import {
  GroupSportEnum,
  gameTeamPlayers,
  games,
  groups,
  MatchStatusEnum,
  ratingEvents,
  ratings,
} from "@repo/db";

import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { type GameRow } from "#src/games/access";
import { type ClassicGlicko } from "@repo/domain/glicko2";
import {
  initialRatingFromChoice,
  type LevelBand,
  type RatingGlickoState,
} from "@repo/domain/level";
import {
  rateDoublesMatch,
  type DoublesOutcome,
} from "@repo/domain/rate-doubles-match";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;
type MatchRow = {
  id: string;
  gameId: string;
  status: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

export const CLUB_GROUP_RATING_WEIGHT = 1;
export const LOOSE_OR_GROUPLESS_RATING_WEIGHT = 0.5;

export type RatedMatchOutcome = DoublesOutcome;

export type RatedMatchWeight =
  | typeof CLUB_GROUP_RATING_WEIGHT
  | typeof LOOSE_OR_GROUPLESS_RATING_WEIGHT;

type SlotUsers = {
  slot1: [string, string];
  slot2: [string, string];
};

function ratingSportFromGame(sport: GameRow["sport"]): "padel" | "football" {
  return sport === GroupSportEnum.FOOTBALL
    ? GroupSportEnum.FOOTBALL
    : GroupSportEnum.PADEL;
}

function defaultRatingState(): RatingGlickoState {
  return initialRatingFromChoice("unknown");
}

function twoUserIds(ids: string[]): [string, string] | null {
  const unique = [...new Set(ids)];
  const first = unique[0];
  const second = unique[1];
  if (unique.length !== 2 || first === undefined || second === undefined) {
    return null;
  }
  return [first, second];
}

async function loadSlotUsers(
  database: DbClient,
  match: MatchRow,
): Promise<SlotUsers | null> {
  if (!match.slot1GameTeamId || !match.slot2GameTeamId) {
    return null;
  }

  const links = await database.query.gameTeamPlayers.findMany({
    where: inArray(gameTeamPlayers.gameTeamId, [
      match.slot1GameTeamId,
      match.slot2GameTeamId,
    ]),
    columns: { gameTeamId: true },
    with: {
      gamePlayer: {
        columns: { userId: true },
      },
    },
  });

  const slot1Ids: string[] = [];
  const slot2Ids: string[] = [];
  for (const link of links) {
    const userId = link.gamePlayer.userId;
    if (!userId) {
      continue;
    }
    if (link.gameTeamId === match.slot1GameTeamId) {
      slot1Ids.push(userId);
    } else if (link.gameTeamId === match.slot2GameTeamId) {
      slot2Ids.push(userId);
    }
  }

  const slot1 = twoUserIds(slot1Ids);
  const slot2 = twoUserIds(slot2Ids);
  if (!slot1 || !slot2) {
    return null;
  }

  const four = new Set([...slot1, ...slot2]);
  if (four.size !== 4) {
    return null;
  }

  return { slot1, slot2 };
}

async function weightForGame(
  database: DbClient,
  groupId: string | null,
): Promise<RatedMatchWeight> {
  if (!groupId) {
    return LOOSE_OR_GROUPLESS_RATING_WEIGHT;
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { communityId: true },
  });

  if (group?.communityId) {
    return CLUB_GROUP_RATING_WEIGHT;
  }

  return LOOSE_OR_GROUPLESS_RATING_WEIGHT;
}

function snapshotState(
  row:
    | {
        mu: number;
        phi: number;
        sigma: number;
        levelBand: LevelBand;
      }
    | undefined,
): RatingGlickoState {
  if (!row) {
    return defaultRatingState();
  }
  return {
    mu: row.mu,
    phi: row.phi,
    sigma: row.sigma,
    levelBand: row.levelBand,
  };
}

async function persistRatedUser(args: {
  database: DbClient;
  userId: string;
  sport: "padel" | "football";
  existingId: string | undefined;
  after: ClassicGlicko;
  levelBand: LevelBand;
  now: Date;
}): Promise<void> {
  const values = {
    mu: args.after.mu,
    phi: args.after.phi,
    sigma: args.after.sigma,
    levelBand: args.levelBand,
    lastRatedAt: args.now,
    updatedAt: args.now,
  };

  if (args.existingId) {
    await args.database
      .update(ratings)
      .set(values)
      .where(eq(ratings.id, args.existingId));
    return;
  }

  try {
    await args.database.insert(ratings).values({
      userId: args.userId,
      sport: args.sport,
      ...values,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    await args.database
      .update(ratings)
      .set(values)
      .where(
        and(eq(ratings.userId, args.userId), eq(ratings.sport, args.sport)),
      );
  }
}

/**
 * Rate the four Users on a completed Match. Skips when the Match is not a
 * Rated Match (cancelled Game, missing sides, not four Users). Idempotent per
 * User+Match. Idle RD inflation runs per User from lastRatedAt before
 * composites and the Glicko step.
 */
export async function applyRatedMatch(
  database: DbClient,
  game: GameRow,
  match: MatchRow,
  result: RatedMatchOutcome,
): Promise<void> {
  if (match.status === MatchStatusEnum.CANCELLED) {
    return;
  }

  const liveGame = await database.query.games.findFirst({
    where: eq(games.id, game.id),
    columns: { cancelledAt: true, groupId: true, sport: true },
  });
  if (!liveGame || liveGame.cancelledAt) {
    return;
  }

  const slots = await loadSlotUsers(database, match);
  if (!slots) {
    return;
  }

  const sport = ratingSportFromGame(liveGame.sport);
  const weight = await weightForGame(database, liveGame.groupId);
  const userIds = [...slots.slot1, ...slots.slot2];

  const existingEvents = await database.query.ratingEvents.findMany({
    where: and(
      eq(ratingEvents.matchId, match.id),
      inArray(ratingEvents.userId, userIds),
    ),
    columns: { userId: true },
  });
  const alreadyRated = new Set(existingEvents.map((row) => row.userId));

  const existingRows = await database.query.ratings.findMany({
    where: and(inArray(ratings.userId, userIds), eq(ratings.sport, sport)),
  });
  const rowByUser = new Map(existingRows.map((row) => [row.userId, row]));

  const now = new Date();
  const playerInput = (userId: string) => ({
    state: snapshotState(rowByUser.get(userId)),
    lastRatedAt: rowByUser.get(userId)?.lastRatedAt,
  });
  const rated = rateDoublesMatch({
    slot1: [playerInput(slots.slot1[0]), playerInput(slots.slot1[1])],
    slot2: [playerInput(slots.slot2[0]), playerInput(slots.slot2[1])],
    outcome: result,
    weight,
    now,
  });

  const players = [
    { userId: slots.slot1[0], ...rated.slot1[0] },
    { userId: slots.slot1[1], ...rated.slot1[1] },
    { userId: slots.slot2[0], ...rated.slot2[0] },
    { userId: slots.slot2[1], ...rated.slot2[1] },
  ];

  for (const player of players) {
    if (alreadyRated.has(player.userId)) {
      continue;
    }

    const { before, after, score, levelBand } = player;

    try {
      const [inserted] = await database
        .insert(ratingEvents)
        .values({
          userId: player.userId,
          sport,
          matchId: match.id,
          outcomeScore: score,
          weight,
          muBefore: before.mu,
          phiBefore: before.phi,
          sigmaBefore: before.sigma,
          muAfter: after.mu,
          phiAfter: after.phi,
          sigmaAfter: after.sigma,
          createdAt: now,
        })
        .onConflictDoNothing({
          target: [ratingEvents.userId, ratingEvents.matchId],
        })
        .returning({ id: ratingEvents.id });

      if (!inserted) {
        continue;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }
      throw error;
    }

    await persistRatedUser({
      database,
      userId: player.userId,
      sport,
      existingId: rowByUser.get(player.userId)?.id,
      after,
      levelBand,
      now,
    });
  }
}
