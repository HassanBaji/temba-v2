import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teams } from "@repo/db";
import {
  isProposalPending,
  proposalExpiresAt,
} from "@repo/domain/challenge-clock";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { checkProposalTerms } from "#src/challenges/proposal-terms";
import { type db } from "#src/db";
import { enqueueAt } from "#src/jobs/enqueue";
import { proposalExpireJob } from "#src/jobs/specs";
import { notifyProposalReceived } from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export const changeProposalInput = z.object({
  proposalId: z.string().uuid(),
  venueId: z.string().uuid(),
  courtId: z.string().uuid().nullable().optional(),
  startsAt: z.date(),
  pricePerPlayerFils: z
    .number()
    .int()
    .min(0)
    .max(PRICE_PER_PLAYER_MAX_FILS)
    .nullable()
    .optional(),
});

export type ChangeProposalInput = z.input<typeof changeProposalInput>;

const TEAM_COLUMNS = {
  id: true,
  sport: true,
  createdBy: true,
  groupId: true,
} as const;

/**
 * Replace a pending Proposal's Venue, Court, start and price in place. The
 * 48 hours start again, the expiry job moves with them, and the posting Team
 * is told again.
 */
export async function changeProposal(
  database: DbClient,
  args: ChangeProposalInput & { userId: string; now?: Date; locale?: Locale },
) {
  const input = changeProposalInput.parse(args);
  const now = args.now ?? new Date();
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).challenge;

  return database.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(challengeProposals)
      .where(eq(challengeProposals.id, input.proposalId))
      .for("update");
    if (!proposal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.errors.proposalNotFound,
      });
    }
    const proposingTeam = await tx.query.teams.findFirst({
      where: eq(teams.id, proposal.teamId),
      columns: TEAM_COLUMNS,
    });
    if (
      !proposingTeam ||
      !(await userActsForTeam(tx, proposingTeam, args.userId))
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.errors.notActing });
    }
    if (!isProposalPending(proposal, now)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.errors.proposalNotPending,
      });
    }
    const challenge = await tx.query.challenges.findFirst({
      where: eq(challenges.id, proposal.challengeId),
    });
    if (challenge?.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.errors.notOpen });
    }

    const courtId = input.courtId ?? null;
    await checkProposalTerms(tx, {
      sport: challenge.sport,
      venueId: input.venueId,
      courtId,
      startsAt: input.startsAt,
      now,
      locale,
    });

    const expiresAt = proposalExpiresAt(now);
    await tx
      .update(challengeProposals)
      .set({
        venueId: input.venueId,
        courtId,
        startsAt: input.startsAt,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(challengeProposals.id, proposal.id));
    await enqueueAt(tx, proposalExpireJob(proposal.id), expiresAt);
    const posterTeam = await tx.query.teams.findFirst({
      where: eq(teams.id, challenge.teamId),
      columns: TEAM_COLUMNS,
    });
    if (posterTeam) {
      await notifyProposalReceived(tx, {
        challengeId: challenge.id,
        proposalId: proposal.id,
        posterTeam,
        proposingTeamId: proposingTeam.id,
        proposedBy: args.userId,
        sentAt: now,
      });
    }
    return { id: proposal.id };
  });
}

export const changeProposalProcedure = protectedProcedure
  .input(changeProposalInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return changeProposal(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
