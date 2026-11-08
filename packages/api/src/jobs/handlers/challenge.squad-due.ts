import { eq } from "drizzle-orm";
import { z } from "zod";

import { games, teams, type Db } from "@repo/db";

import { loadChallengeSides } from "#src/games/challenge-squad";
import { enqueueAt } from "#src/jobs/enqueue";
import { challengeSquadDueJob, JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { notifySquadDue } from "#src/notifications/notify-challenge";

export const jobName = JOB.challengeSquadDue;
export const payloadSchema = z.object({ gameId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.challengeSquadDue;

export const SQUAD_DUE_BEFORE_KICK_OFF_MS = 24 * 60 * 60 * 1000;

/** When the reminder for a Challenge Game kicking off at `windowStart` runs. */
export function squadDueAt(windowStart: Date) {
  return new Date(windowStart.getTime() - SQUAD_DUE_BEFORE_KICK_OFF_MS);
}

/**
 * A day before kick-off, tells who acts for each side still empty or short
 * to name the squad, once per side. Nothing on a cancelled Game or when both
 * sides are named. A kick-off moved later sends the job to the new time.
 */
export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    const game = await tx.query.games.findFirst({
      where: eq(games.id, payload.gameId),
    });
    if (!game?.challengeId || game.cancelledAt) {
      return;
    }
    if (game.windowStart) {
      const dueAt = squadDueAt(game.windowStart);
      if (dueAt.getTime() > now.getTime()) {
        await enqueueAt(tx, challengeSquadDueJob(game.id), dueAt);
        return;
      }
    }
    const sides = (await loadChallengeSides(tx, game)) ?? [];
    for (const side of sides) {
      if (
        !side.teamId ||
        (side.squadState !== "empty" && side.squadState !== "partial")
      ) {
        continue;
      }
      const team = await tx.query.teams.findFirst({
        where: eq(teams.id, side.teamId),
        columns: { id: true, sport: true, createdBy: true, groupId: true },
      });
      if (!team) {
        continue;
      }
      await notifySquadDue(tx, {
        challengeId: game.challengeId,
        gameId: game.id,
        team,
        opponentTeamId:
          sides.find((other) => other.gameTeamId !== side.gameTeamId)?.teamId ??
          null,
      });
    }
  });
}
