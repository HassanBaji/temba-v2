import { and, eq, inArray } from "drizzle-orm";

import {
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
  gameRates,
  gameRatesGroup,
} from "@repo/domain/game-rating-eligibility";
import { applyFootballLevelMatch } from "#src/ratings/apply-football-level-match";
import { applyGroupRatedMatch } from "#src/ratings/apply-group-rated-match";
import { applyTierMatch } from "#src/ratings/apply-tier-match";
import { openRatingWindow } from "#src/ratings/settle-rating-window";
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

export type SlotUsers = {
  slot1: [string, string];
  slot2: [string, string];
};

function ratingSportFromGame(sport: GameRow["sport"]): "padel" | "football" {
  return sport;
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
    columns: { venueId: true },
  });

  if (group?.venueId) {
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
 * Rate the four Users on a completed Match: their Temba Ratings when the Game
 * is Temba rated, their Group Levels when it is group rated (ADR-0053). A
 * football Match moves every seated player's OVR when it counts for Temba
 * Level, or their Tier points on a tier Group. Skips
 * when the Match is not a Rated Match (cancelled or Unrated Game, missing
 * sides, not four Users). Idempotent per User+Match. Group Levels go first so
 * a first Group Level starts from the Temba Rating before this Match.
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
    columns: {
      cancelledAt: true,
      groupId: true,
      sport: true,
      rated: true,
      groupRated: true,
    },
  });
  if (!liveGame) {
    return;
  }
  const ratesTemba = gameRates(liveGame);
  const ratesGroup = gameRatesGroup(liveGame);
  if (!ratesTemba && !ratesGroup) {
    return;
  }

  if (liveGame.sport === "football") {
    if (!match.slot1GameTeamId || !match.slot2GameTeamId) {
      return;
    }
    const now = new Date();
    // A football Game that counts for Temba Level moves OVR (ADR-0069).
    if (ratesTemba) {
      await applyFootballLevelMatch(database, {
        matchId: match.id,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        result,
        weight: await weightForGame(database, liveGame.groupId),
        now,
      });
      return;
    }
    // A football Game's group scope moves Tier points (ADR-0066). With
    // Performance ratings on, the move waits for the Rating window to settle
    // (ADR-0068).
    if (ratesGroup && liveGame.groupId) {
      if (
        await openRatingWindow(database, {
          game: { ...game, groupId: liveGame.groupId },
          matchId: match.id,
          now,
        })
      ) {
        return;
      }
      await applyTierMatch(database, {
        groupId: liveGame.groupId,
        matchId: match.id,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        result,
        now,
      });
    }
    return;
  }

  const slots = await loadSlotUsers(database, match);
  if (!slots) {
    return;
  }

  const sport = ratingSportFromGame(liveGame.sport);
  const now = new Date();
  if (ratesGroup && liveGame.groupId) {
    await applyGroupRatedMatch(database, {
      groupId: liveGame.groupId,
      sport,
      matchId: match.id,
      slots,
      result,
      now,
    });
  }
  if (ratesTemba) {
    await applyTembaRatedMatch(database, {
      groupId: liveGame.groupId,
      sport,
      matchId: match.id,
      slots,
      result,
      now,
    });
  }
}

/**
 * Temba Ratings for the four Users. Idle RD inflation runs per User from
 * lastRatedAt before composites and the Glicko step.
 */
async function applyTembaRatedMatch(
  database: DbClient,
  args: {
    groupId: string | null;
    sport: "padel" | "football";
    matchId: string;
    slots: SlotUsers;
    result: RatedMatchOutcome;
    now: Date;
  },
): Promise<void> {
  const { sport, slots, now } = args;
  const match = { id: args.matchId };
  const result = args.result;
  const weight = await weightForGame(database, args.groupId);
  const userIds = [...slots.slot1, ...slots.slot2];

  const existingEvents = await database.query.ratingEvents.findMany({
    where: and(
      eq(ratingEvents.matchId, match.id),
      inArray(ratingEvents.userId, userIds),
    ),
    columns: { userId: true },
  });
  const alreadyRated = new Set(existingEvents.map((row) => row.userId));

  // Locked in user-id order so a Level override or reversal on the same rows
  // serializes with this write instead of being overwritten by it.
  const existingRows = await database
    .select()
    .from(ratings)
    .where(and(inArray(ratings.userId, userIds), eq(ratings.sport, sport)))
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(existingRows.map((row) => [row.userId, row]));

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
          levelBandBefore: playerInput(player.userId).state.levelBand,
          lastRatedAtBefore: rowByUser.get(player.userId)?.lastRatedAt ?? null,
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
