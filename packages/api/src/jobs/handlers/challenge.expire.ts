import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  challengeProposals,
  challenges,
  teams,
  type Db,
  type DbTx,
} from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";

import { enqueueAt } from "#src/jobs/enqueue";
import { challengeExpireJob, JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { notifyChallengeExpired } from "#src/notifications/notify-challenge";

export const jobName = JOB.challengeExpire;
export const payloadSchema = z.object({ challengeId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.challengeExpire;

/**
 * Stamps an open Challenge `expired` once its seven days are up and no
 * Proposal is pending, and tells the Users who act for the Team. A pending
 * Proposal keeps it open: the job comes back when that Proposal's 48 hours end.
 * The Proposal clock applies the same rule in its own run.
 */
export async function applyChallengeExpiry(
  tx: DbTx,
  challengeId: string,
  now: Date,
): Promise<void> {
  const [challenge] = await tx
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .for("update");
  if (challenge?.status !== "open") {
    return;
  }
  if (challenge.expiresAt.getTime() > now.getTime()) {
    await enqueueAt(tx, challengeExpireJob(challenge.id), challenge.expiresAt);
    return;
  }
  const pending = (
    await tx.query.challengeProposals.findMany({
      where: and(
        eq(challengeProposals.challengeId, challenge.id),
        eq(challengeProposals.status, "pending"),
      ),
      columns: { status: true, expiresAt: true },
    })
  ).filter((proposal) => isProposalPending(proposal, now));
  if (pending.length > 0) {
    const lastExpiry = Math.max(
      ...pending.map((proposal) => proposal.expiresAt.getTime()),
    );
    await enqueueAt(tx, challengeExpireJob(challenge.id), new Date(lastExpiry));
    return;
  }
  await tx
    .update(challenges)
    .set({ status: "expired", expiredAt: now, updatedAt: now })
    .where(and(eq(challenges.id, challenge.id), eq(challenges.status, "open")));
  const team = await tx.query.teams.findFirst({
    where: eq(teams.id, challenge.teamId),
    columns: { id: true, sport: true, createdBy: true, groupId: true },
  });
  if (team) {
    await notifyChallengeExpired(tx, { challengeId: challenge.id, team });
  }
}

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction((tx) =>
    applyChallengeExpiry(tx, payload.challengeId, now),
  );
}
