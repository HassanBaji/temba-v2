import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges } from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadChallengeCards } from "#src/challenges/challenge-cards";
import { loadProposalViews } from "#src/challenges/challenge-proposals";
import { type db } from "#src/db";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * One Challenge for any signed-in User. In its open state: the poster Team,
 * Format, Level wanted, Venues, days and timings, note, who posted it, the
 * Proposal count, and the viewer's Teams that may propose. Pending: the
 * viewer's Teams' Proposals, to change or withdraw. Who acts for the poster
 * also gets the Proposal queue, oldest first, to decide on.
 */
export async function challengeById(
  database: DbClient,
  args: { challengeId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const row = await database.query.challenges.findFirst({
    where: eq(challenges.id, args.challengeId),
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(args.locale ?? DEFAULT_LOCALE).challenge.detail
        .notFound,
    });
  }
  const [card] = await loadChallengeCards(database, [row], {
    userId: args.userId,
    now,
  });
  if (!card) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  const open = card.state === "open";
  const pendingRows = open
    ? (
        await database.query.challengeProposals.findMany({
          where: and(
            eq(challengeProposals.challengeId, row.id),
            eq(challengeProposals.status, "pending"),
          ),
          orderBy: [
            asc(challengeProposals.createdAt),
            asc(challengeProposals.id),
          ],
        })
      ).filter((proposal) => isProposalPending(proposal, now))
    : [];
  const viewerTeamIds = new Set(
    pendingRows.length === 0
      ? []
      : (await teamsUserActsFor(database, args.userId)).map((team) => team.id),
  );
  const proposals = await loadProposalViews(database, pendingRows);
  return {
    ...card,
    viewerEligibleTeams: card.viewer.eligibleTeams,
    viewerCanWithdraw: row.status === "open" && card.viewer.actsForPoster,
    viewerProposals: proposals.filter((proposal) =>
      viewerTeamIds.has(proposal.team.id),
    ),
    proposalQueue: card.viewer.actsForPoster ? proposals : [],
    viewerCanDecide: open && card.viewer.actsForPoster,
  };
}

export const byIdProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return challengeById(ctx.db, {
      challengeId: input.id,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
