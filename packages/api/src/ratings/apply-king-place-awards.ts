import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";

import {
  gameTeams,
  GroupSportEnum,
  kingPlaceAwards,
  notifications,
  ratings,
  user,
} from "@repo/db";
import { gameRates } from "@repo/domain/game-rating-eligibility";
import type { DoublesPlayerInput } from "@repo/domain/rate-doubles-match";
import {
  kingField,
  kingFieldPlayer,
  kingPlaceWins,
  rateKingPlace,
  type KingField,
  type KingPlaceResult,
} from "@repo/domain/rate-king-place";

import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  persistRatedUser,
  snapshotState,
} from "#src/ratings/apply-rated-match";
import { withoutMuMove } from "#src/ratings/without-mu-move";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type RatingRow = typeof ratings.$inferSelect;
type AwardRow = typeof kingPlaceAwards.$inferSelect;

const PADEL = GroupSportEnum.PADEL;

/**
 * Takes one Place award back off its player's Rating. A Rating nothing has
 * touched since goes back to exactly what it was, and a row the award created
 * goes with it. A Rating that a Rated Match, a Level override or another
 * Place award has moved since keeps that move: only what the award added to
 * μ comes off, so a corrected Final order is never refused.
 */
async function takeBackAward(
  tx: Tx,
  award: AwardRow,
  row: RatingRow | undefined,
  now: Date,
): Promise<RatingRow | undefined> {
  if (!row) {
    return undefined;
  }
  const untouched =
    row.mu === award.muAfter &&
    row.phi === award.phiAfter &&
    row.sigma === award.sigmaAfter;
  if (untouched && !award.hadRating) {
    await tx.delete(ratings).where(eq(ratings.id, row.id));
    return undefined;
  }
  const restored: RatingRow = untouched
    ? {
        ...row,
        mu: award.muBefore,
        phi: award.phiBefore,
        sigma: award.sigmaBefore,
        levelBand: award.levelBandBefore,
        lastRatedAt: award.lastRatedAtBefore,
        updatedAt: now,
      }
    : { ...row, ...withoutMuMove(row, award), updatedAt: now };
  await tx
    .update(ratings)
    .set({
      mu: restored.mu,
      phi: restored.phi,
      sigma: restored.sigma,
      levelBand: restored.levelBand,
      lastRatedAt: restored.lastRatedAt,
      updatedAt: now,
    })
    .where(eq(ratings.id, row.id));
  return restored;
}

/**
 * Writes a King of the court Game's Place awards from its Final order as it
 * now stands (ADR-0089): the players of the Game teams placed first to fourth
 * are rated as 2, 1, a half and a quarter of a win against the field, the
 * mean of everyone on a court. Every post of the Final order calls it, in
 * that post's transaction and under the Game lock: the awards of the order
 * before are taken back first, so a corrected order leaves only its own. A
 * Guest player is neither rated nor counted in the field, and a guest partner
 * stands in at the field (ADR-0079). A Game that does not count for Temba
 * Level writes nothing.
 */
export async function applyKingPlaceAwards(
  tx: Tx,
  game: {
    id: string;
    groupId: string | null;
    rated: boolean;
    cancelledAt: Date | null;
  },
  now: Date,
): Promise<void> {
  if (!gameRates(game)) {
    return;
  }

  const teams = (
    await tx.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      columns: { id: true, startCourt: true, finalPlace: true },
      with: {
        players: { with: { gamePlayer: { columns: { userId: true } } } },
      },
    })
  )
    .filter((team) => team.startCourt != null)
    .map((team) => ({
      finalPlace: team.finalPlace,
      userIds: [
        ...new Set(
          team.players.flatMap((link) => link.gamePlayer.userId ?? []),
        ),
      ],
    }));
  const seatedUserIds = [...new Set(teams.flatMap((team) => team.userIds))];
  const guestIds = new Set(
    seatedUserIds.length === 0
      ? []
      : (
          await tx.query.user.findMany({
            where: and(
              inArray(user.id, seatedUserIds),
              isNotNull(user.guestAt),
            ),
            columns: { id: true },
          })
        ).map((row) => row.id),
  );
  const fieldUserIds = seatedUserIds.filter((userId) => !guestIds.has(userId));

  const earlier = await tx
    .select()
    .from(kingPlaceAwards)
    .where(eq(kingPlaceAwards.gameId, game.id));
  const lockedUserIds = [
    ...new Set([...fieldUserIds, ...earlier.map((award) => award.userId)]),
  ];

  // Locked in user-id order, as a Rated Match locks them, so a Level override
  // or another rating write on the same rows serializes with this one.
  const rows =
    lockedUserIds.length === 0
      ? []
      : await tx
          .select()
          .from(ratings)
          .where(
            and(
              inArray(ratings.userId, lockedUserIds),
              eq(ratings.sport, PADEL),
            ),
          )
          .orderBy(ratings.userId)
          .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));

  for (const award of earlier) {
    const restored = await takeBackAward(
      tx,
      award,
      rowByUser.get(award.userId),
      now,
    );
    if (restored) {
      rowByUser.set(award.userId, restored);
    } else {
      rowByUser.delete(award.userId);
    }
  }
  if (earlier.length > 0) {
    await tx.delete(kingPlaceAwards).where(eq(kingPlaceAwards.gameId, game.id));
  }

  const inputOf = (userId: string): DoublesPlayerInput => ({
    state: snapshotState(rowByUser.get(userId), "padel"),
    lastRatedAt: rowByUser.get(userId)?.lastRatedAt,
  });
  const field = kingField(fieldUserIds.map(inputOf), now);
  const placings = field
    ? rateKingPlaces({ teams, guestIds, field, inputOf, now })
    : [];
  const awardedUserIds: string[] = [];
  for (const { userId, result, ...placing } of placings) {
    const row = rowByUser.get(userId);
    const before = snapshotState(row, "padel");
    await tx.insert(kingPlaceAwards).values({
      userId,
      sport: PADEL,
      gameId: game.id,
      finalPlace: placing.finalPlace,
      wins: placing.wins,
      fieldMu: placing.field.mu,
      fieldPhi: placing.field.phi,
      hadRating: row !== undefined,
      // The stored Rating, before idle inflation, so taking the award back
      // restores it exactly.
      muBefore: before.mu,
      phiBefore: before.phi,
      sigmaBefore: before.sigma,
      muAfter: result.after.mu,
      phiAfter: result.after.phi,
      sigmaAfter: result.after.sigma,
      levelBandBefore: before.levelBand,
      lastRatedAtBefore: row?.lastRatedAt ?? null,
      createdAt: now,
    });
    await persistRatedUser({
      database: tx,
      userId,
      sport: PADEL,
      existingId: row?.id,
      after: result.after,
      levelBand: result.levelBand,
      now,
    });
    awardedUserIds.push(userId);
  }

  // A player the corrected order no longer places is no longer told they moved.
  await tx
    .delete(notifications)
    .where(
      and(
        eq(notifications.gameId, game.id),
        eq(notifications.type, "king_place_awarded"),
        awardedUserIds.length > 0
          ? notInArray(notifications.recipientUserId, awardedUserIds)
          : undefined,
      ),
    );
  await notify(tx, {
    type: "king_place_awarded",
    recipients: awardedUserIds.map((userId) => ({
      userId,
      audience: "player" as const,
    })),
    excludeUserIds: [],
    groupId: game.groupId,
    gameId: game.id,
    dedupeKey: `king_place_awarded:${game.id}`,
  });
}

export type KingPlacing = {
  userId: string;
  finalPlace: number;
  wins: number;
  field: KingField;
  result: KingPlaceResult;
};

/**
 * Rates the players of each placed Game team against the field, in the order
 * of `teams`. A Guest player is not rated.
 */
export function rateKingPlaces(args: {
  teams: readonly { finalPlace: number | null; userIds: readonly string[] }[];
  guestIds: ReadonlySet<string>;
  field: KingField;
  inputOf: (userId: string) => DoublesPlayerInput;
  now: Date;
}): KingPlacing[] {
  const { field, inputOf, now } = args;
  const placings: KingPlacing[] = [];
  for (const team of args.teams) {
    const wins = kingPlaceWins(team.finalPlace);
    const [first, second] = team.userIds.filter(
      (userId) => !args.guestIds.has(userId),
    );
    if (wins === 0 || team.finalPlace == null || !first) {
      continue;
    }
    // A player whose partner left is rated beside themselves, so the pair
    // shifts nothing; a guest partner stands in at the field.
    const partner = second
      ? inputOf(second)
      : team.userIds.length > 1
        ? kingFieldPlayer(field)
        : inputOf(first);
    const results = rateKingPlace({
      pair: [inputOf(first), partner],
      field,
      wins,
      now,
    });
    for (const [index, userId] of [first, second].entries()) {
      const result = results[index];
      if (userId && result) {
        placings.push({
          userId,
          finalPlace: team.finalPlace,
          wins,
          field,
          result,
        });
      }
    }
  }
  return placings;
}
