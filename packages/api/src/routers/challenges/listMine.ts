import { and, desc, eq, inArray } from "drizzle-orm";

import { challengeProposals, challenges } from "@repo/db";
import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadChallengeCards } from "#src/challenges/challenge-cards";
import { type db } from "#src/db";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

async function openBoardCount(database: DbClient, now: Date) {
  const rows = await database.query.challenges.findMany({
    where: eq(challenges.status, "open"),
    columns: { id: true, status: true, expiresAt: true },
  });
  if (rows.length === 0) {
    return 0;
  }
  const pending = await database.query.challengeProposals.findMany({
    where: and(
      inArray(
        challengeProposals.challengeId,
        rows.map((row) => row.id),
      ),
      eq(challengeProposals.status, "pending"),
    ),
    columns: { challengeId: true, status: true, expiresAt: true },
  });
  return rows.filter((row) =>
    isChallengeOpen(
      row,
      now,
      pending.some(
        (proposal) =>
          proposal.challengeId === row.id && isProposalPending(proposal, now),
      ),
    ),
  ).length;
}

/**
 * The Mine segment. Posted only for now: the open Challenges of the Teams the
 * viewer acts for, newest first, with Proposal counts and days left.
 */
export async function listMine(
  database: DbClient,
  args: { userId: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const teamIds = (await teamsUserActsFor(database, args.userId)).map(
    (team) => team.id,
  );
  const rows =
    teamIds.length === 0
      ? []
      : await database.query.challenges.findMany({
          where: and(
            eq(challenges.status, "open"),
            inArray(challenges.teamId, teamIds),
          ),
          orderBy: [desc(challenges.createdAt), desc(challenges.id)],
        });
  const posted = (
    await loadChallengeCards(database, rows, { userId: args.userId, now })
  ).filter((card) => card.state === "open");
  return {
    counts: { open: await openBoardCount(database, now), mine: posted.length },
    posted,
  };
}

export const listMineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMine(ctx.db, { userId: appUser.id });
});
