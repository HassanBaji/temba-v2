import { eq } from "drizzle-orm";

import { challengeProposals, challenges, type DbTx } from "@repo/db";

/**
 * Locks a Proposal's Challenge, then the Proposal, `for update`. Every door
 * that writes both takes the Challenge first, as withdraw and propose do, so
 * two doors never wait on each other.
 */
export async function lockProposalWithChallenge(tx: DbTx, proposalId: string) {
  const found = await tx.query.challengeProposals.findFirst({
    where: eq(challengeProposals.id, proposalId),
    columns: { challengeId: true },
  });
  if (!found) {
    return null;
  }
  const [challenge] = await tx
    .select()
    .from(challenges)
    .where(eq(challenges.id, found.challengeId))
    .for("update");
  const [proposal] = await tx
    .select()
    .from(challengeProposals)
    .where(eq(challengeProposals.id, proposalId))
    .for("update");
  if (!proposal) {
    return null;
  }
  return { proposal, challenge: challenge ?? null };
}
