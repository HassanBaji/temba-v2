import type { DbClient, DbTx } from "@repo/db";
import { and, eq, inArray } from "drizzle-orm";

import { challengeProposals, challenges, type teams } from "@repo/db";
import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";
import type { ChallengePostBlock } from "@repo/domain/challenge-form";
import { teamIsSquad, teamRosterRule } from "@repo/domain/team-roster";

type DbOrTx = DbClient | DbTx;

type TeamForPost = Pick<typeof teams.$inferSelect, "id" | "sport">;

/**
 * Teams with a Challenge that is still open by the clock. A row past its
 * seven days with no pending Proposal is one the expiry job has not stamped
 * yet, and does not count.
 */
async function teamIdsWithOpenChallenge(
  database: DbOrTx,
  teamIds: readonly string[],
  now: Date,
) {
  if (teamIds.length === 0) {
    return new Set<string>();
  }
  const open = await database.query.challenges.findMany({
    where: and(
      inArray(challenges.teamId, [...teamIds]),
      eq(challenges.status, "open"),
    ),
    columns: { id: true, teamId: true, status: true, expiresAt: true },
  });
  const due = open.filter((row) => !isChallengeOpen(row, now));
  const pending =
    due.length === 0
      ? []
      : await database.query.challengeProposals.findMany({
          where: and(
            inArray(
              challengeProposals.challengeId,
              due.map((row) => row.id),
            ),
            eq(challengeProposals.status, "pending"),
          ),
          columns: { challengeId: true, status: true, expiresAt: true },
        });
  const keptAlive = new Set(
    pending
      .filter((proposal) => isProposalPending(proposal, now))
      .map((proposal) => proposal.challengeId),
  );
  return new Set(
    open
      .filter((row) => isChallengeOpen(row, now, keptAlive.has(row.id)))
      .map((row) => row.teamId),
  );
}

/**
 * Why each Team cannot post a Challenge now, or null when it can: one open
 * Challenge at a time, padel with both players, football with a Roster that
 * fields the smallest Format.
 */
export async function challengePostBlocks(
  database: DbOrTx,
  teams: readonly TeamForPost[],
  rosterCounts: ReadonlyMap<string, number>,
  now: Date,
): Promise<Map<string, ChallengePostBlock | null>> {
  const withOpen = await teamIdsWithOpenChallenge(
    database,
    teams.map((team) => team.id),
    now,
  );
  return new Map(
    teams.map((team) => {
      if (withOpen.has(team.id)) {
        return [team.id, "open_challenge"];
      }
      if (
        (rosterCounts.get(team.id) ?? 0) < teamRosterRule(team.sport).completeAt
      ) {
        return [
          team.id,
          teamIsSquad(team.sport) ? "roster_short" : "padel_incomplete",
        ];
      }
      return [team.id, null];
    }),
  );
}
