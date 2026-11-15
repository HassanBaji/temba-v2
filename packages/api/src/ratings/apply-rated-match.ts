import { and, eq, inArray, isNotNull } from "drizzle-orm";

import {
  gameTeamPlayers,
  games,
  MatchStatusEnum,
  ratingEvents,
  ratings,
  user,
} from "@repo/db";

import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { type GameRow } from "#src/games/access";
import { type ClassicGlicko } from "@repo/domain/glicko2";
import {
  gameRates,
  gameRatesGroup,
} from "@repo/domain/game-rating-eligibility";
import { applyTierMatch } from "#src/ratings/apply-tier-match";
import { notifyLevelConfirmed } from "#src/ratings/level-confirmed";
import { ratingWeightForGame } from "#src/ratings/game-rating-weight";
import { openRatingWindow } from "#src/ratings/settle-rating-window";
import { withGuestStandIns } from "#src/ratings/guest-stand-ins";
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

export {
  CLUB_GROUP_RATING_WEIGHT,
  LOOSE_OR_GROUPLESS_RATING_WEIGHT,
  type RatedMatchWeight,
} from "#src/ratings/game-rating-weight";

export type RatedMatchOutcome = DoublesOutcome;

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

async function loadGuestIds(
  database: DbClient,
  slots: SlotUsers,
): Promise<Set<string>> {
  const rows = await database.query.user.findMany({
    where: and(
      inArray(user.id, [...slots.slot1, ...slots.slot2]),
      isNotNull(user.guestAt),
    ),
    columns: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

export function snapshotState(
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

export async function persistRatedUser(args: {
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
 * is Temba rated. A football Match that counts for Temba Level opens its
 * Rating window, whose settling moves every seated player's OVR; on a tier
 * Group it moves their Tier points. A padel Group Level is retired
 * (ADR-0066), so a padel Game's group scope moves nothing; its Matches still
 * count in the Standing. Skips when the Match is not a Rated Match (cancelled
 * or Unrated Game, missing sides, not four Users, or four Guest players). A
 * Guest player plays at the mean of the others and is never rated
 * (ADR-0079). Idempotent per User+Match.
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
      isPublic: true,
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
    // A football Game that counts for Temba Level moves OVR by four parts,
    // written when its Rating window settles (ADR-0069).
    if (ratesTemba) {
      await openRatingWindow(database, {
        game: { ...game, groupId: liveGame.groupId },
        matchId: match.id,
        now,
        countsForLevel: true,
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
  if (!ratesTemba) {
    return;
  }
  const slots = await loadSlotUsers(database, match);
  if (!slots) {
    return;
  }
  const guestIds = await loadGuestIds(database, slots);
  if (guestIds.size === 4) {
    return;
  }

  await applyTembaRatedMatch(database, {
    game: liveGame,
    sport: ratingSportFromGame(liveGame.sport),
    matchId: match.id,
    slots,
    guestIds,
    result,
    now: new Date(),
  });
}

/**
 * Temba Ratings for the four Users. Idle RD inflation runs per User from
 * lastRatedAt before composites and the Glicko step.
 */
async function applyTembaRatedMatch(
  database: DbClient,
  args: {
    game: { groupId: string | null; isPublic: boolean };
    sport: "padel" | "football";
    matchId: string;
    slots: SlotUsers;
    guestIds: ReadonlySet<string>;
    result: RatedMatchOutcome;
    now: Date;
  },
): Promise<void> {
  const { sport, slots, guestIds, now } = args;
  const match = { id: args.matchId };
  const result = args.result;
  const weight = await ratingWeightForGame(database, args.game);
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

  const playerInput = withGuestStandIns(userIds, guestIds, (userId) => ({
    state: snapshotState(rowByUser.get(userId)),
    lastRatedAt: rowByUser.get(userId)?.lastRatedAt,
  }));
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

  const ratedUserIds: string[] = [];
  for (const player of players) {
    if (alreadyRated.has(player.userId) || guestIds.has(player.userId)) {
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
    ratedUserIds.push(player.userId);
  }
  await notifyLevelConfirmed(database, {
    matchId: match.id,
    sport,
    userIds: ratedUserIds,
  });
}
