import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, games, matches, matchSets, type Db } from "@repo/db";

import { isPublicGame } from "@repo/domain/game-rating-scope";
import { matchOutcome } from "@repo/domain/match-outcome";

import {
  matchResultFullyConfirmed,
  publicGameConfirmWindowClosesAt,
} from "#src/games/match-result-confirmations";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { enqueueAt } from "#src/jobs/enqueue";
import { JOB, MAX_ATTEMPTS, confirmWindowJob } from "#src/jobs/specs";

export const jobName = JOB.confirmWindow;
export const payloadSchema = z.object({ matchId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.confirmWindow;

/**
 * A Public Game's score the other side has not confirmed stands 24 hours
 * after it was entered, and counts for nothing (ADR-0071). A changed score
 * restarts the clock, so a Job that wakes early moves itself to the new time.
 */
export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, payload.matchId),
  });
  if (
    match?.status !== MatchStatusEnum.PENDING ||
    match.notFinishedAt != null
  ) {
    return;
  }
  const game = await db.query.games.findFirst({
    where: eq(games.id, match.gameId),
  });
  if (!game || !isPublicGame(game) || game.cancelledAt != null) {
    return;
  }
  const sets = await db.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  if (matchOutcome(sets).result === "none") {
    return;
  }
  const closesAt = await publicGameConfirmWindowClosesAt(db, match.id);
  if (!closesAt) {
    return;
  }
  if (closesAt.getTime() > now.getTime()) {
    await enqueueAt(db, confirmWindowJob(match.id), closesAt);
    return;
  }
  await runMatchCompletionEffect(db, game, match.id, {
    stoodUnconfirmed: !(await matchResultFullyConfirmed(db, match)),
  });
}
