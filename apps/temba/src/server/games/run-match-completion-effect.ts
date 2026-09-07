import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";

import { type db } from "~/server/db";
import { type GameRow } from "~/server/games/access";
import { matchOutcome } from "~/server/games/match-outcome";
import { applyRatedMatch } from "~/server/ratings/apply-rated-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Completes a Match and applies its rating effect. This is the automatic
 * counterpart to the organizer's unilateral `completeMatch` door (ADR-0011):
 * it fires once every seated User's Match result confirmation is recorded,
 * from either `scoreSet.ts` (a Set write that reaches full confirmation) or
 * `confirmMatchResult.ts`. `completeMatch.ts` keeps its own, unchanged
 * organizer force-complete transaction — this is a separate trigger path,
 * not a call into that door.
 *
 * Idempotent: locks the Match row and no-ops if it is already
 * completed/cancelled or has no Match outcome yet, so a duplicate
 * confirmation cannot double-fire the rating effect.
 */
export async function runMatchCompletionEffect(
  database: DbClient,
  game: GameRow,
  matchId: string,
): Promise<void> {
  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .for("update");
    if (!locked) {
      return;
    }
    if (locked.status === MatchStatusEnum.CANCELLED) {
      return;
    }
    if (locked.status === MatchStatusEnum.COMPLETED) {
      return;
    }

    const sets = await tx.query.matchSets.findMany({
      where: eq(matchSets.matchId, locked.id),
      columns: { slot1GamesWon: true, slot2GamesWon: true },
    });
    const outcome = matchOutcome(sets);
    if (outcome.result === "none") {
      return;
    }

    await tx
      .update(matches)
      .set({ status: MatchStatusEnum.COMPLETED, updatedAt: new Date() })
      .where(eq(matches.id, locked.id));

    await applyRatedMatch(tx, game, locked, outcome.result);
  });
}
