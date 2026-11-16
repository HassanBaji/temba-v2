import { and, eq, gt, inArray } from "drizzle-orm";

import {
  GroupSportEnum,
  levelCheckBallots,
  levelCheckResults,
  levelOverrides,
  ratings,
  type matches,
} from "@repo/db";
import { bandWithHysteresis, levelFromMu } from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  levelCheckStep,
  levelCheckVerdict,
  levelCheckVerdictHundredths,
  type LevelCheckPick,
} from "@repo/domain/level-check";

import { type db } from "#src/db";
import { sideUserIds } from "#src/ratings/apply-tier-match";
import { ratingWeightForGame } from "#src/ratings/game-rating-weight";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const PADEL = GroupSportEnum.PADEL;

type SidedMatch = Pick<
  typeof matches.$inferSelect,
  "id" | "slot1GameTeamId" | "slot2GameTeamId"
>;

/**
 * A Rating window asks the Level check when it is a padel window that counts
 * for Temba Level: today a padel Friendly game on a Verified Group (ADR-0095).
 * Football windows, tier Groups, tournaments and Challenge Games open no such
 * window.
 */
export function levelCheckAsked(
  window: { countsForLevel: boolean },
  sport: "padel" | "football",
) {
  return window.countsForLevel && sport === "padel";
}

/**
 * The answers a Level check counts on a Match, by the player they are about:
 * from a seated player about another seated player, each marked by whether
 * the rater sat on the opposing Game team. A Guest player is seated on
 * neither side.
 */
export async function levelCheckPicks(
  database: DbClient,
  match: SidedMatch,
): Promise<Map<string, LevelCheckPick[]>> {
  const [slot1, slot2] = await Promise.all(
    [match.slot1GameTeamId, match.slot2GameTeamId].map(async (gameTeamId) =>
      gameTeamId
        ? new Set(await sideUserIds(database, gameTeamId))
        : new Set<string>(),
    ),
  );
  const sideOf = (userId: string) =>
    slot1?.has(userId) ? 1 : slot2?.has(userId) ? 2 : null;
  const ballots = await database
    .select({
      raterUserId: levelCheckBallots.raterUserId,
      rateeUserId: levelCheckBallots.rateeUserId,
      band: levelCheckBallots.band,
    })
    .from(levelCheckBallots)
    .where(eq(levelCheckBallots.matchId, match.id));
  const picks = new Map<string, LevelCheckPick[]>();
  for (const ballot of ballots) {
    const raterSide = sideOf(ballot.raterUserId);
    const rateeSide = sideOf(ballot.rateeUserId);
    if (raterSide === null || rateeSide === null) {
      continue;
    }
    const list = picks.get(ballot.rateeUserId) ?? [];
    list.push({
      band: displayLabelFromStoredBand(ballot.band),
      fromOpponent: raterSide !== rateeSide,
    });
    picks.set(ballot.rateeUserId, list);
  }
  return picks;
}

/**
 * Settles a padel Match's Level check with its Rating window: each player
 * with enough answers, one of them from an opponent, gets the verdict blended
 * into their Level at the Game's weight, and one result row keeps the verdict
 * and the Rating either side. Not a rating event: it is not a Rated Match,
 * and `last_rated_at`, σ and Reliability stay. Writes nothing for a Match
 * that already has results, so settling twice writes once. Returns the
 * players it settled.
 */
export async function settleLevelChecks(
  database: DbClient,
  args: {
    match: SidedMatch;
    game: { groupId: string | null; isPublic: boolean };
    now: Date;
  },
): Promise<string[]> {
  const existing = await database
    .select({ id: levelCheckResults.id })
    .from(levelCheckResults)
    .where(eq(levelCheckResults.matchId, args.match.id))
    .limit(1);
  if (existing.length > 0) {
    return [];
  }
  const picks = await levelCheckPicks(database, args.match);
  const verdicts = [...picks.entries()].flatMap(([userId, userPicks]) => {
    const verdict = levelCheckVerdict(userPicks);
    return verdict.kind === "verdict" ? [{ userId, verdict }] : [];
  });
  if (verdicts.length === 0) {
    return [];
  }
  // Locked in user-id order, as every other writer of these rows locks them.
  const rows = await database
    .select()
    .from(ratings)
    .where(
      and(
        inArray(
          ratings.userId,
          verdicts.map((row) => row.userId),
        ),
        eq(ratings.sport, PADEL),
      ),
    )
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const weight = await ratingWeightForGame(database, args.game);

  const settled: string[] = [];
  for (const { userId, verdict } of verdicts) {
    const row = rowByUser.get(userId);
    if (!row) {
      continue;
    }
    const step = levelCheckStep(row, verdict.level, weight);
    await database
      .update(ratings)
      .set({
        mu: step.mu,
        phi: step.phi,
        levelBand: step.levelBand,
        updatedAt: args.now,
      })
      .where(eq(ratings.id, row.id));
    await database.insert(levelCheckResults).values({
      userId,
      sport: PADEL,
      matchId: args.match.id,
      verdictLevelHundredths: levelCheckVerdictHundredths(verdict.level),
      agreed: step.agreed,
      ballotsCounted: verdict.ballotsCounted,
      weight,
      muBefore: row.mu,
      phiBefore: row.phi,
      muAfter: step.mu,
      phiAfter: step.phi,
      levelBandBefore: row.levelBand,
      createdAt: args.now,
    });
    settled.push(userId);
  }
  return settled;
}

/**
 * Takes a Match's Level check back off each player's Rating and deletes its
 * results; the answers stay for when the Match completes again. A Rating
 * nothing has touched since goes back exactly. One that a Rated Match, a
 * Place award or another Level check has moved since keeps that move: only
 * what the check added to μ comes off. A Level override set since is the
 * player's baseline, so their Rating stays as it is.
 */
export async function takeBackLevelChecks(
  database: DbClient,
  matchId: string,
  now: Date,
): Promise<void> {
  const results = await database
    .select()
    .from(levelCheckResults)
    .where(eq(levelCheckResults.matchId, matchId))
    .orderBy(levelCheckResults.userId);
  if (results.length === 0) {
    return;
  }
  const rows = await database
    .select()
    .from(ratings)
    .where(
      and(
        inArray(
          ratings.userId,
          results.map((result) => result.userId),
        ),
        eq(ratings.sport, PADEL),
      ),
    )
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));

  for (const result of results) {
    const row = rowByUser.get(result.userId);
    if (!row) {
      continue;
    }
    const overriddenSince = await database.query.levelOverrides.findFirst({
      where: and(
        eq(levelOverrides.userId, result.userId),
        eq(levelOverrides.sport, result.sport),
        gt(levelOverrides.createdAt, result.createdAt),
      ),
      columns: { id: true },
    });
    if (overriddenSince) {
      continue;
    }
    const untouched = row.mu === result.muAfter && row.phi === result.phiAfter;
    const mu = row.mu - (result.muAfter - result.muBefore);
    await database
      .update(ratings)
      .set(
        untouched
          ? {
              mu: result.muBefore,
              phi: result.phiBefore,
              levelBand: result.levelBandBefore,
              updatedAt: now,
            }
          : {
              mu,
              levelBand: bandWithHysteresis(levelFromMu(mu), row.levelBand),
              updatedAt: now,
            },
      )
      .where(eq(ratings.id, row.id));
  }
  await database
    .delete(levelCheckResults)
    .where(eq(levelCheckResults.matchId, matchId));
}
