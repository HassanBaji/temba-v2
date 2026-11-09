import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teams, type Db } from "@repo/db";

import { enqueueAt } from "#src/jobs/enqueue";
import { JOB, MAX_ATTEMPTS, proposalExpireJob } from "#src/jobs/specs";
import { notifyProposalExpired } from "#src/notifications/notify-challenge";

import { applyChallengeExpiry } from "./challenge.expire";

export const jobName = JOB.proposalExpire;
export const payloadSchema = z.object({ proposalId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.proposalExpire;

const TEAM_COLUMNS = {
  id: true,
  sport: true,
  createdBy: true,
  groupId: true,
} as const;

/**
 * Stamps a pending Proposal `expired` once its 48 hours are up and tells the
 * Users who act for the proposing Team. Then the Challenge expiry rule runs in
 * the same transaction: a Challenge past day 7 with no other pending Proposal
 * expires now.
 */
export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(challengeProposals)
      .where(eq(challengeProposals.id, payload.proposalId))
      .for("update");
    if (proposal?.status !== "pending") {
      return;
    }
    if (proposal.expiresAt.getTime() > now.getTime()) {
      await enqueueAt(tx, proposalExpireJob(proposal.id), proposal.expiresAt);
      return;
    }
    await tx
      .update(challengeProposals)
      .set({ status: "expired", decidedAt: now, updatedAt: now })
      .where(
        and(
          eq(challengeProposals.id, proposal.id),
          eq(challengeProposals.status, "pending"),
        ),
      );
    const proposingTeam = await tx.query.teams.findFirst({
      where: eq(teams.id, proposal.teamId),
      columns: TEAM_COLUMNS,
    });
    const challenge = await tx.query.challenges.findFirst({
      where: eq(challenges.id, proposal.challengeId),
      columns: { id: true, teamId: true },
    });
    if (proposingTeam && challenge) {
      await notifyProposalExpired(tx, {
        challengeId: challenge.id,
        proposalId: proposal.id,
        proposingTeam,
        posterTeamId: challenge.teamId,
      });
    }
    await applyChallengeExpiry(tx, proposal.challengeId, now);
  });
}
