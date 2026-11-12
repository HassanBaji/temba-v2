import { eq } from "drizzle-orm";

import { matchSets } from "@repo/db";

import { isPublicGame } from "@repo/domain/game-rating-scope";
import { matchOutcome } from "@repo/domain/match-outcome";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import { knockoutMatchIsLevel } from "#src/games/knockout-advance";
import {
  clearMatchResultConfirmations,
  clearMatchResultConfirmationsExceptUser,
  keepMatchResultConfirmation,
  matchResultFullyConfirmed,
  matchSideSeats,
  publicGameConfirmWindowClosesAt,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { type MatchRow } from "#src/games/utils";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import { confirmWindowJob, confirmWindowJobKey } from "#src/jobs/specs";
import { notify } from "#src/notifications/notify";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Starts the other side's 24 hours on a Public Game's entered score: the
 * Job that lets it stand, and a Notification to each of their account
 * holders (ADR-0071).
 */
export async function askOtherSideToConfirm(
  tx: Tx,
  args: { game: GameRow; match: MatchRow; userId: string },
) {
  const closesAt = await publicGameConfirmWindowClosesAt(tx, args.match.id);
  if (!closesAt) {
    return;
  }
  await enqueueAt(tx, confirmWindowJob(args.match.id), closesAt);
  const sides = await matchSideSeats(tx, args.match);
  const enteringSide = sides.find((side) => side.userIds.includes(args.userId));
  await notify(tx, {
    type: "match_score_to_confirm",
    recipients: sides
      .filter((side) => side !== enteringSide)
      .flatMap((side) =>
        side.accountHolderIds.map((userId) => ({
          userId,
          audience: "player" as const,
        })),
      ),
    excludeUserIds: [args.userId],
    actorUserId: args.userId,
    groupId: args.game.groupId,
    gameId: args.game.id,
  });
}

/**
 * ADR-0011: the User who changes a Match's Sets into a result is confirmed
 * automatically, and every other confirmation goes once the score changed, so
 * a changed score needs agreeing again rather than standing on stale ones. A
 * level Knockout Match, or one with no result left, has nothing to confirm.
 * On a Public Game a changed score restarts the other side's 24 hours, and
 * saving the same score again does not move them (ADR-0071).
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
    if (isPublicGame(args.game)) {
      await removeJob(tx, confirmWindowJobKey(args.match.id));
    }
    return;
  }
  if (args.scoreChanged) {
    await clearMatchResultConfirmationsExceptUser(
      tx,
      args.match.id,
      args.userId,
    );
  }
  if (isPublicGame(args.game) && !args.scoreChanged) {
    await keepMatchResultConfirmation(tx, args.match.id, args.userId);
  } else {
    await recordMatchResultConfirmation(tx, args.match.id, args.userId);
  }
  if (await matchResultFullyConfirmed(tx, args.match)) {
    await runMatchCompletionEffect(tx, args.game, args.match.id);
    return;
  }
  if (isPublicGame(args.game) && args.scoreChanged) {
    await askOtherSideToConfirm(tx, args);
  }
}
