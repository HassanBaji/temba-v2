import { and, asc, desc, eq, inArray, or } from "drizzle-orm";

import { challengeProposals, challenges } from "@repo/db";
import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadChallengeCards } from "#src/challenges/challenge-cards";
import {
  loadProposalViews,
  loadTeamDisplayNames,
} from "#src/challenges/challenge-proposals";
import { type db } from "#src/db";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
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

const PLAYED_LIMIT = 10;

const MS_PER_MINUTE = 60 * 1000;

/**
 * The Mine segment, in display order: Proposals waiting on the viewer's Teams
 * as poster (soonest to lapse first), then those Teams' open Challenges, then
 * the viewer's Teams' pending Proposals, then confirmed Challenges still to
 * play, then the last ten played. Read-time clocks apply, so nothing expired
 * shows. `posted` stays for clients that read the posted section alone.
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

  const pendingRows =
    teamIds.length === 0
      ? []
      : (
          await database.query.challengeProposals.findMany({
            where: and(
              eq(challengeProposals.status, "pending"),
              or(
                inArray(challengeProposals.teamId, teamIds),
                inArray(
                  challengeProposals.challengeId,
                  database
                    .select({ id: challenges.id })
                    .from(challenges)
                    .where(
                      and(
                        eq(challenges.status, "open"),
                        inArray(challenges.teamId, teamIds),
                      ),
                    ),
                ),
              ),
            ),
            with: { challenge: { columns: { status: true, teamId: true } } },
            orderBy: [
              asc(challengeProposals.expiresAt),
              asc(challengeProposals.id),
            ],
          })
        ).filter(
          (proposal) =>
            proposal.challenge.status === "open" &&
            isProposalPending(proposal, now),
        );
  const ours = new Set(teamIds);
  const waitingRows = pendingRows.filter((proposal) =>
    ours.has(proposal.challenge.teamId),
  );
  const sentRows = pendingRows.filter(
    (proposal) =>
      ours.has(proposal.teamId) && !ours.has(proposal.challenge.teamId),
  );

  const confirmed =
    teamIds.length === 0
      ? []
      : await database.query.challenges.findMany({
          where: and(
            eq(challenges.status, "confirmed"),
            or(
              inArray(challenges.teamId, teamIds),
              inArray(
                challenges.confirmedProposalId,
                database
                  .select({ id: challengeProposals.id })
                  .from(challengeProposals)
                  .where(inArray(challengeProposals.teamId, teamIds)),
              ),
            ),
          ),
          with: {
            game: { columns: { id: true, windowStart: true } },
          },
        });
  const confirmedProposals =
    confirmed.length === 0
      ? []
      : await database.query.challengeProposals.findMany({
          where: inArray(
            challengeProposals.id,
            confirmed
              .map((row) => row.confirmedProposalId)
              .filter((id): id is string => id != null),
          ),
        });

  const [waiting, sent] = await Promise.all([
    loadProposalViews(database, waitingRows),
    loadProposalViews(database, sentRows),
  ]);
  const names = await loadTeamDisplayNames(database, [
    ...pendingRows.map((proposal) => proposal.challenge.teamId),
    ...confirmed.map((row) => row.teamId),
    ...confirmedProposals.map((proposal) => proposal.teamId),
  ]);
  const teamName = (teamId: string) =>
    names.get(teamId) ?? teamDisplayName(null, []);
  const posterOf = (challengeId: string) =>
    pendingRows.find((proposal) => proposal.challengeId === challengeId)
      ?.challenge.teamId ?? "";

  const games = confirmed
    .map((row) => {
      const proposal = confirmedProposals.find(
        (candidate) => candidate.id === row.confirmedProposalId,
      );
      if (!proposal) {
        return null;
      }
      const [teamId, opponentId] = ours.has(row.teamId)
        ? [row.teamId, proposal.teamId]
        : [proposal.teamId, row.teamId];
      const startsAt = row.game?.windowStart ?? proposal.startsAt;
      return {
        endsAt: startsAt.getTime() + row.durationMinutes * MS_PER_MINUTE,
        challengeId: row.id,
        gameId: row.game?.id ?? null,
        sport: row.sport,
        startsAt,
        team: { id: teamId, displayName: teamName(teamId) },
        opponent: { id: opponentId, displayName: teamName(opponentId) },
      };
    })
    .filter((game) => game != null);
  const accepted = games
    .filter((game) => game.endsAt > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const played = games
    .filter((game) => game.endsAt <= now.getTime())
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, PLAYED_LIMIT);

  const items = [
    ...waiting.map((proposal) => ({
      kind: "waiting" as const,
      key: `waiting:${proposal.id}`,
      challengeId: proposal.challengeId,
      posterTeam: {
        id: posterOf(proposal.challengeId),
        displayName: teamName(posterOf(proposal.challengeId)),
      },
      proposal,
    })),
    ...posted.map((challenge) => ({
      kind: "posted" as const,
      key: `posted:${challenge.id}`,
      challengeId: challenge.id,
      challenge,
    })),
    ...sent.map((proposal) => ({
      kind: "pending" as const,
      key: `pending:${proposal.id}`,
      challengeId: proposal.challengeId,
      posterTeam: {
        id: posterOf(proposal.challengeId),
        displayName: teamName(posterOf(proposal.challengeId)),
      },
      proposal,
    })),
    ...accepted.map((game) => ({
      kind: "accepted" as const,
      key: `accepted:${game.challengeId}`,
      challengeId: game.challengeId,
      gameId: game.gameId,
      sport: game.sport,
      startsAt: game.startsAt,
      team: game.team,
      opponent: game.opponent,
    })),
    ...played.map((game) => ({
      kind: "played" as const,
      key: `played:${game.challengeId}`,
      challengeId: game.challengeId,
      gameId: game.gameId,
      sport: game.sport,
      startsAt: game.startsAt,
      team: game.team,
      opponent: game.opponent,
    })),
  ];

  return {
    counts: {
      open: await openBoardCount(database, now),
      mine: items.filter((item) => item.kind !== "played").length,
    },
    posted,
    items,
  };
}

export const listMineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMine(ctx.db, { userId: appUser.id });
});
