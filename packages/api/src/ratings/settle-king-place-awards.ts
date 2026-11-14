import { and, eq, inArray, isNotNull } from "drizzle-orm";

import {
  gameTeams,
  games,
  GroupSportEnum,
  kingPlaceAwards,
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
} from "@repo/domain/rate-king-place";
import {
  finalOrderStillOpen,
  isKingOfTheCourt,
} from "@repo/domain/tournament-king";

import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  persistRatedUser,
  snapshotState,
} from "#src/ratings/apply-rated-match";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

const PADEL = GroupSportEnum.PADEL;

type SettleableGame = {
  format: string;
  tournamentShape: string | null;
  rated: boolean;
  cancelledAt: Date | null;
  finalOrderPostedAt: Date | null;
  placeAwardsSettledAt: Date | null;
};

/**
 * Whether a King of the court Game's Place awards are still to write: it
 * counts for Temba Level, its Final order is posted and can no longer change,
 * and nothing was written yet.
 */
export function kingPlaceAwardsDue(game: SettleableGame, now: Date) {
  return (
    isKingOfTheCourt(game.format, game.tournamentShape) &&
    gameRates(game) &&
    game.finalOrderPostedAt != null &&
    game.placeAwardsSettledAt == null &&
    !finalOrderStillOpen(game.finalOrderPostedAt, now)
  );
}

/**
 * Writes a King of the court Game's Place awards once its Final order has
 * closed (ADR-0089): the players of the Game teams placed first to fourth are
 * rated as 2, 1, a half and a quarter of a win against the field, the mean of
 * everyone on a court. A Guest player is neither rated nor counted in the
 * field, and a guest partner stands in at the field (ADR-0079). Idempotent:
 * the Game is marked settled under its lock. Returns whether it wrote.
 */
export async function settleKingPlaceAwards(
  tx: Tx,
  gameId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const [game] = await tx
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .for("update");
  if (!game || !kingPlaceAwardsDue(game, now)) {
    return false;
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

  // Locked in user-id order, as a Rated Match locks them, so a Level override
  // or another rating write on the same rows serializes with this one.
  const rows =
    fieldUserIds.length === 0
      ? []
      : await tx
          .select()
          .from(ratings)
          .where(
            and(
              inArray(ratings.userId, fieldUserIds),
              eq(ratings.sport, PADEL),
            ),
          )
          .orderBy(ratings.userId)
          .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const inputOf = (userId: string): DoublesPlayerInput => ({
    state: snapshotState(rowByUser.get(userId)),
    lastRatedAt: rowByUser.get(userId)?.lastRatedAt,
  });

  const field = kingField(fieldUserIds.map(inputOf), now);
  const awardedUserIds: string[] = [];
  for (const team of field ? teams : []) {
    const wins = kingPlaceWins(team.finalPlace);
    const [first, second] = team.userIds.filter(
      (userId) => !guestIds.has(userId),
    );
    if (!field || wins === 0 || team.finalPlace == null || !first) {
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
      if (!userId || !result) {
        continue;
      }
      const row = rowByUser.get(userId);
      const [inserted] = await tx
        .insert(kingPlaceAwards)
        .values({
          userId,
          sport: PADEL,
          gameId: game.id,
          finalPlace: team.finalPlace,
          wins,
          fieldMu: field.mu,
          fieldPhi: field.phi,
          muBefore: result.before.mu,
          phiBefore: result.before.phi,
          sigmaBefore: result.before.sigma,
          muAfter: result.after.mu,
          phiAfter: result.after.phi,
          sigmaAfter: result.after.sigma,
          levelBandBefore: snapshotState(row).levelBand,
          lastRatedAtBefore: row?.lastRatedAt ?? null,
          createdAt: now,
        })
        .onConflictDoNothing({
          target: [kingPlaceAwards.userId, kingPlaceAwards.gameId],
        })
        .returning({ id: kingPlaceAwards.id });
      if (!inserted) {
        continue;
      }
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
  }

  await tx
    .update(games)
    .set({ placeAwardsSettledAt: now, updatedAt: now })
    .where(eq(games.id, game.id));

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
  return true;
}

/**
 * The read-time fallback for a late or failed Job: once the Final order has
 * closed, a read writes the Place awards so nobody waits on them.
 */
export async function settleKingPlaceAwardsIfDue(
  database: DbClient,
  game: SettleableGame & { id: string },
  now: Date,
): Promise<boolean> {
  if (!kingPlaceAwardsDue(game, now)) {
    return false;
  }
  return database.transaction((tx) => settleKingPlaceAwards(tx, game.id, now));
}
