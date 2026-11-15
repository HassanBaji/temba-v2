import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, teams } from "@repo/db";
import {
  isProposalPending,
  proposalExpiresAt,
} from "@repo/domain/challenge-clock";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { lockProposalWithChallenge } from "#src/challenges/lock-proposal";
import { checkProposalTerms } from "#src/challenges/proposal-terms";
import { type db } from "#src/db";
import { enqueueAt } from "#src/jobs/enqueue";
import { proposalExpireJob } from "#src/jobs/specs";
import { notifyProposalReceived } from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** Each change restarts the 48 hours, so a Proposal cannot hold a Challenge open forever. */
export const PROPOSAL_MAX_CHANGES = 3;

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
 * Replace a pending Proposal's Venue, Court, start and price in place, up to
 * `PROPOSAL_MAX_CHANGES` times. The 48 hours start again, the expiry job
 * moves with them, and the posting Team is told again.
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
    const locked = await lockProposalWithChallenge(tx, input.proposalId);
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.errors.proposalNotFound,
      });
    }
    const { proposal, challenge } = locked;
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
    if (challenge?.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.errors.notOpen });
    }
    if (proposal.changeCount >= PROPOSAL_MAX_CHANGES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.errors.changeLimit(PROPOSAL_MAX_CHANGES),
      });
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
        changeCount: sql`${challengeProposals.changeCount} + 1`,
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
