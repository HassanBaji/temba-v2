import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import {
  challengeProposals,
  challenges,
  courts,
  games,
  matches,
  user,
} from "@repo/db";
import { isProposalPending } from "@repo/domain/challenge-clock";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadChallengeCards } from "#src/challenges/challenge-cards";
import {
  loadProposalViews,
  loadTeamDisplayNames,
  loadTeamFaces,
} from "#src/challenges/challenge-proposals";
import { type db } from "#src/db";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * The confirmed state: the Challenge Game with each side's squad state, who
 * proposed and who confirmed, the Pitch or Court, and the price each.
 */
async function confirmedGame(
  database: DbClient,
  row: typeof challenges.$inferSelect,
  userId: string,
) {
  if (row.status !== "confirmed" || !row.gameId) {
    return null;
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, row.gameId),
    with: { venue: { columns: { name: true, city: true } } },
  });
  if (!game?.windowStart) {
    return null;
  }
  const proposal = row.confirmedProposalId
    ? await database.query.challengeProposals.findFirst({
        where: eq(challengeProposals.id, row.confirmedProposalId),
      })
    : undefined;
  const match = await database.query.matches.findFirst({
    where: and(eq(matches.gameId, game.id), ne(matches.status, "cancelled")),
    columns: { courtId: true },
  });
  const court = match?.courtId
    ? await database.query.courts.findFirst({
        where: eq(courts.id, match.courtId),
        columns: { name: true },
      })
    : undefined;
  const people = await database.query.user.findMany({
    where: inArray(
      user.id,
      [proposal?.proposedBy, proposal?.decidedBy].filter(
        (id): id is string => id != null,
      ),
    ),
    columns: { id: true, name: true },
  });
  const nameOf = (id: string | null | undefined) =>
    people.find((person) => person.id === id)?.name ?? null;
  const sides = (await loadChallengeSides(database, game)) ?? [];
  const names = await loadTeamDisplayNames(
    database,
    sides.flatMap((side) => (side.teamId ? [side.teamId] : [])),
  );
  return {
    id: game.id,
    sport: game.sport,
    startsAt: game.windowStart,
    endsAt: game.windowEnd,
    cancelled: game.cancelledAt != null,
    venue: { name: game.venue.name, city: game.venue.city },
    court: court ? { name: court.name } : null,
    pricePerPlayerFils: game.pricePerPlayerFils,
    proposedBy: {
      name: nameOf(proposal?.proposedBy),
      teamId: proposal?.teamId ?? null,
      isViewer: proposal?.proposedBy === userId,
    },
    confirmedBy: { name: nameOf(proposal?.decidedBy) },
    confirmedAt: proposal?.decidedAt ?? null,
    sides: sides.map((side) => ({
      teamId: side.teamId,
      displayName: side.teamId ? (names.get(side.teamId) ?? null) : null,
      sideSize: side.sideSize,
      namedCount: side.named.length,
      squadState: side.squadState,
    })),
  };
}

/**
 * One Challenge for any signed-in User. In its open state: the poster Team,
 * Format, Level wanted, Venues, days and timings, note, who posted it, the
 * Proposal count, and the viewer's Teams that may propose. Pending: the
 * viewer's Teams' Proposals, to change or withdraw. Who acts for the poster
 * also gets the Proposal queue, oldest first, to decide on. Confirmed: the
 * Challenge Game. `teamFaces` draws every Team on the screen: the poster,
 * each proposing Team and both sides of the Game.
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
  const game = await confirmedGame(database, row, args.userId);
  const teamFaces = await loadTeamFaces(
    database,
    [
      row.teamId,
      ...proposals.map((proposal) => proposal.team.id),
      ...(game?.sides ?? []).flatMap((side) =>
        side.teamId ? [side.teamId] : [],
      ),
    ],
    { userId: args.userId, now },
  );
  return {
    ...card,
    viewerEligibleTeams: card.viewer.eligibleTeams,
    viewerCanWithdraw: row.status === "open" && card.viewer.actsForPoster,
    viewerProposals: proposals.filter((proposal) =>
      viewerTeamIds.has(proposal.team.id),
    ),
    proposalQueue: card.viewer.actsForPoster ? proposals : [],
    viewerCanDecide: open && card.viewer.actsForPoster,
    game,
    teamFaces,
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
