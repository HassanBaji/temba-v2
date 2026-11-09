import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teams } from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import { challengeExpireJob, proposalExpireJobKey } from "#src/jobs/specs";
import { notifyProposalDeclined } from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const TEAM_COLUMNS = {
  id: true,
  sport: true,
  createdBy: true,
  groupId: true,
} as const;

/**
 * "Another time": the posting Team declines a pending Proposal on its open
 * Challenge. The proposing Team is told and may propose again. A Challenge
 * already past its seven days is handed back to its clock.
 */
export async function declineProposal(
  database: DbClient,
  args: { proposalId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const m = messagesFor(args.locale ?? DEFAULT_LOCALE).challenge;
  return database.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(challengeProposals)
      .where(eq(challengeProposals.id, args.proposalId))
      .for("update");
    if (!proposal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.errors.proposalNotFound,
      });
    }
    const [challenge] = await tx
      .select()
      .from(challenges)
      .where(eq(challenges.id, proposal.challengeId))
      .for("update");
    if (!challenge) {
      throw new TRPCError({ code: "NOT_FOUND", message: m.detail.notFound });
    }
    const posterTeam = await tx.query.teams.findFirst({
      where: eq(teams.id, challenge.teamId),
      columns: TEAM_COLUMNS,
    });
    if (!posterTeam || !(await userActsForTeam(tx, posterTeam, args.userId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.errors.notActing });
    }
    if (challenge.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.errors.notOpen });
    }
    if (!isProposalPending(proposal, now)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.errors.proposalNotPending,
      });
    }
    await tx
      .update(challengeProposals)
      .set({
        status: "declined",
        decidedBy: args.userId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(challengeProposals.id, proposal.id));
    await removeJob(tx, proposalExpireJobKey(proposal.id));
    const proposingTeam = await tx.query.teams.findFirst({
      where: eq(teams.id, proposal.teamId),
      columns: TEAM_COLUMNS,
    });
    if (proposingTeam) {
      await notifyProposalDeclined(tx, {
        challengeId: challenge.id,
        proposalId: proposal.id,
        proposingTeam,
        posterTeamId: posterTeam.id,
        decidedBy: args.userId,
      });
    }
    await enqueueAt(
      tx,
      challengeExpireJob(challenge.id),
      new Date(Math.max(challenge.expiresAt.getTime(), now.getTime())),
    );
    return { id: proposal.id };
  });
}

export const declineProposalProcedure = protectedProcedure
  .input(z.object({ proposalId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return declineProposal(ctx.db, {
      proposalId: input.proposalId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
