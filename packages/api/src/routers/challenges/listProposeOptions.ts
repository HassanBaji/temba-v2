import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, courts } from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";
import { challengeSuggestedSlots } from "@repo/domain/challenge-slots";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadChallengeCards } from "#src/challenges/challenge-cards";
import { loadTeamFaces } from "#src/challenges/challenge-proposals";
import { liveVenuesOfferingSport } from "#src/challenges/venues-for-sport";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * For the Accept sheet: the viewer's Teams that may propose (with the pending
 * Proposal each already has here, for Change proposal), Venues with the sport
 * (the Challenge's preferred ones first) and their Courts, and the suggested
 * slots from the Challenge's days and timings plus its exact slots. Each
 * Team carries its face (sport, Team Level, Roster) for the Team cards.
 */
export async function listProposeOptions(
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

  const eligibleIds = card.viewer.eligibleTeams.map((team) => team.id);
  const pending =
    eligibleIds.length === 0
      ? []
      : (
          await database.query.challengeProposals.findMany({
            where: and(
              eq(challengeProposals.challengeId, row.id),
              eq(challengeProposals.status, "pending"),
              inArray(challengeProposals.teamId, eligibleIds),
            ),
          })
        ).filter((proposal) => isProposalPending(proposal, now));

  const offering = await liveVenuesOfferingSport(database, row.sport);
  const preferredIds = card.venues.map((venue) => venue.id);
  const venues = [
    ...preferredIds
      .map((id) => offering.find((venue) => venue.id === id))
      .filter((venue) => venue != null),
    ...offering.filter((venue) => !preferredIds.includes(venue.id)),
  ];
  const courtRows =
    venues.length === 0
      ? []
      : await database
          .select({ id: courts.id, name: courts.name, venueId: courts.venueId })
          .from(courts)
          .where(
            and(
              inArray(
                courts.venueId,
                venues.map((venue) => venue.id),
              ),
              eq(courts.sport, row.sport),
            ),
          )
          .orderBy(asc(courts.name), asc(courts.id));
  const faces = await loadTeamFaces(database, eligibleIds, {
    userId: args.userId,
    now,
  });

  return {
    challengeId: row.id,
    state: card.state,
    sport: row.sport,
    durationMinutes: row.durationMinutes,
    days: row.days,
    timings: row.timings,
    posterTeam: { id: card.team.id, displayName: card.team.displayName },
    teams: card.viewer.eligibleTeams.map((team) => {
      const proposal = pending.find(
        (candidate) => candidate.teamId === team.id,
      );
      return {
        ...team,
        face: faces.find((face) => face.id === team.id) ?? null,
        pendingProposal: proposal
          ? {
              id: proposal.id,
              venueId: proposal.venueId,
              courtId: proposal.courtId,
              startsAt: proposal.startsAt,
              pricePerPlayerFils: proposal.pricePerPlayerFils,
            }
          : null,
      };
    }),
    venues: venues.map((venue) => ({
      ...venue,
      preferred: preferredIds.includes(venue.id),
      courts: courtRows
        .filter((court) => court.venueId === venue.id)
        .map((court) => ({ id: court.id, name: court.name })),
    })),
    slots: challengeSuggestedSlots(
      {
        days: row.days,
        timings: row.timings,
        exactSlots: [
          ...row.exactSlots,
          ...pending.map((proposal) => proposal.startsAt),
        ],
      },
      now,
    ),
  };
}

export const listProposeOptionsProcedure = protectedProcedure
  .input(z.object({ challengeId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listProposeOptions(ctx.db, {
      challengeId: input.challengeId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
