import { eq } from "drizzle-orm";

import { matchSets } from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import { knockoutMatchIsLevel } from "#src/games/knockout-advance";
import {
  clearMatchResultConfirmations,
  clearMatchResultConfirmationsExceptUser,
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { type MatchRow } from "#src/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * ADR-0011: the User who changes a Match's Sets into a result is confirmed
 * automatically, and every other confirmation goes once the score changed, so
 * a changed score needs agreeing again rather than standing on stale ones. A
 * level Knockout Match, or one with no result left, has nothing to confirm.
 */
export async function settleConfirmationsAfterSetChange(
  tx: Tx,
  args: {
    game: GameRow;
    match: MatchRow;
    userId: string;
    scoreChanged: boolean;
  },
) {
  const sets = await tx.query.matchSets.findMany({
    where: eq(matchSets.matchId, args.match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(sets);
  if (
    outcome.result === "none" ||
    knockoutMatchIsLevel(args.match, outcome.result)
  ) {
    await clearMatchResultConfirmations(tx, args.match.id);
    return;
  }
  if (args.scoreChanged) {
    await clearMatchResultConfirmationsExceptUser(
      tx,
      args.match.id,
      args.userId,
    );
  }
  await recordMatchResultConfirmation(tx, args.match.id, args.userId);
  if (await matchResultFullyConfirmed(tx, args.match)) {
    await runMatchCompletionEffect(tx, args.game, args.match.id);
  }
}
