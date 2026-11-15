import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teams } from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { lockProposalWithChallenge } from "#src/challenges/lock-proposal";
import { type db } from "#src/db";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import { challengeExpireJob, proposalExpireJobKey } from "#src/jobs/specs";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * Take back a pending Proposal. Only someone who acts for the proposing Team
 * may; the Team may propose again while the Challenge is open. A Challenge
 * already past its seven days is handed back to its clock.
 */
export async function withdrawProposal(
  database: DbClient,
  args: { proposalId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const m = messagesFor(args.locale ?? DEFAULT_LOCALE).challenge;
  return database.transaction(async (tx) => {
    const proposal = (await lockProposalWithChallenge(tx, args.proposalId))
      ?.proposal;
    if (!proposal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.errors.proposalNotFound,
      });
    }
    const team = await tx.query.teams.findFirst({
      where: eq(teams.id, proposal.teamId),
      columns: { id: true, sport: true, createdBy: true, groupId: true },
    });
    if (!team || !(await userActsForTeam(tx, team, args.userId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.errors.notActing });
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
        status: "withdrawn",
        decidedBy: args.userId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(challengeProposals.id, proposal.id));
    await removeJob(tx, proposalExpireJobKey(proposal.id));
    const challenge = await tx.query.challenges.findFirst({
      where: eq(challenges.id, proposal.challengeId),
      columns: { id: true, status: true, expiresAt: true },
    });
    if (challenge?.status === "open") {
      await enqueueAt(
        tx,
        challengeExpireJob(challenge.id),
        new Date(Math.max(challenge.expiresAt.getTime(), now.getTime())),
      );
    }
    return { id: proposal.id };
  });
}

export const withdrawProposalProcedure = protectedProcedure
  .input(z.object({ proposalId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return withdrawProposal(ctx.db, {
      proposalId: input.proposalId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
