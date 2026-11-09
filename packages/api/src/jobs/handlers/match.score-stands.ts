import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, games, matches, matchSets, type Db } from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";

import { enteredScore } from "#src/games/tournament-score";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { enqueueAt } from "#src/jobs/enqueue";
import { JOB, MAX_ATTEMPTS, scoreStandsJob } from "#src/jobs/specs";

export const jobName = JOB.scoreStands;
export const payloadSchema = z.object({ matchId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.scoreStands;

/**
 * A tournament score the other team has not answered stands ten minutes
 * after it was entered (ADR-0062). A correction restarts the clock, so a Job
 * that wakes early moves itself to the new time.
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
  const sets = await db.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  if (matchOutcome(sets).result === "none") {
    return;
  }
  const entered = await enteredScore(db, match);
  if (!entered) {
    return;
  }
  if (entered.standsAt.getTime() > now.getTime()) {
    await enqueueAt(db, scoreStandsJob(match.id), entered.standsAt);
    return;
  }
  const game = await db.query.games.findFirst({
    where: eq(games.id, match.gameId),
  });
  if (!game) {
    return;
  }
  await runMatchCompletionEffect(db, game, match.id);
}
