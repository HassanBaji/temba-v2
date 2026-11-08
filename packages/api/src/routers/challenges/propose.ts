import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teamMembers, teams } from "@repo/db";
import { challengeIneligibleLine } from "@repo/domain/challenge-card";
import {
  isChallengeOpen,
  isProposalPending,
  proposalExpiresAt,
} from "@repo/domain/challenge-clock";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadViewerTeams,
  teamIneligibleReason,
} from "#src/challenges/challenge-eligibility";
import { checkProposalTerms } from "#src/challenges/proposal-terms";
import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { enqueueAt } from "#src/jobs/enqueue";
import { proposalExpireJob } from "#src/jobs/specs";
import { notifyProposalReceived } from "#src/notifications/notify-challenge";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export const proposeInput = z.object({
  challengeId: z.string().uuid(),
  teamId: z.string().uuid(),
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

export type ProposeInput = z.input<typeof proposeInput>;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * Send a Proposal on an open Challenge for a Team the User acts for: same
 * sport, not the poster and sharing no member with it, Roster at least the
 * Format's side (padel: both players), Team Level inside the Level wanted,
 * one pending per Team; a start an hour to 30 days ahead at a Venue with the
 * sport, and a Court on that Venue if one is named. Pending for 48 hours; the
 * posting Team is told.
 */
export async function proposeOnChallenge(
  database: DbClient,
  args: ProposeInput & { userId: string; now?: Date; locale?: Locale },
) {
  const input = proposeInput.parse(args);
  const now = args.now ?? new Date();
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).challenge;

  try {
    return await database.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(challenges)
        .where(eq(challenges.id, input.challengeId))
        .for("update");
      if (!challenge) {
        throw new TRPCError({ code: "NOT_FOUND", message: m.detail.notFound });
      }
      const pendingRows = await tx.query.challengeProposals.findMany({
        where: and(
          eq(challengeProposals.challengeId, challenge.id),
          eq(challengeProposals.status, "pending"),
        ),
      });
      const pending = pendingRows.filter((row) => isProposalPending(row, now));
      if (!isChallengeOpen(challenge, now, pending.length > 0)) {
        refuse(m.errors.notOpen);
      }

      const team = (await loadViewerTeams(tx, args.userId, now)).find(
        (candidate) => candidate.id === input.teamId,
      );
      if (!team) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: m.errors.notActing,
        });
      }
      if (team.sport !== challenge.sport) {
        refuse(m.ineligible.noTeam[challenge.sport]);
      }
      const posterMembers = await tx.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, challenge.teamId),
        columns: { userId: true },
      });
      const reason = teamIneligibleReason(
        challenge,
        new Set(posterMembers.map((member) => member.userId)),
        team,
      );
      if (reason) {
        refuse(challengeIneligibleLine(reason, challenge, locale));
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

      if (pending.some((row) => row.teamId === team.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: m.errors.alreadyProposed,
        });
      }
      const stale = pendingRows.find(
        (row) => row.teamId === team.id && !isProposalPending(row, now),
      );
      if (stale) {
        await tx
          .update(challengeProposals)
          .set({ status: "expired", decidedAt: now, updatedAt: now })
          .where(eq(challengeProposals.id, stale.id));
      }

      const expiresAt = proposalExpiresAt(now);
      const [created] = await tx
        .insert(challengeProposals)
        .values({
          challengeId: challenge.id,
          teamId: team.id,
          proposedBy: args.userId,
          venueId: input.venueId,
          courtId,
          startsAt: input.startsAt,
          pricePerPlayerFils: input.pricePerPlayerFils ?? null,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: challengeProposals.id });
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      await enqueueAt(tx, proposalExpireJob(created.id), expiresAt);
      const posterTeam = await tx.query.teams.findFirst({
        where: eq(teams.id, challenge.teamId),
        columns: { id: true, sport: true, createdBy: true, groupId: true },
      });
      if (posterTeam) {
        await notifyProposalReceived(tx, {
          challengeId: challenge.id,
          proposalId: created.id,
          posterTeam,
          proposingTeamId: team.id,
          proposedBy: args.userId,
          sentAt: now,
        });
      }
      return { id: created.id };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: m.errors.alreadyProposed,
      });
    }
    throw error;
  }
}

export const proposeProcedure = protectedProcedure
  .input(proposeInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return proposeOnChallenge(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
