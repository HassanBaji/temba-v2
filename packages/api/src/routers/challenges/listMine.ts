import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";

import {
  challengeProposals,
  challenges,
  games,
  gameTeams,
  teamMembers,
} from "@repo/db";
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
import { loadChallengeSides } from "#src/games/challenge-squad";
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

/**
 * The Challenge Games of every Team the viewer is on or acts for, from
 * `games.challenge_id`, each read from the viewer's side: its squad state,
 * whether the viewer should name that squad, and the Sets from that side.
 * Played once the window has passed or the Match is completed.
 */
async function loadChallengeGames(
  database: DbClient,
  userId: string,
  actingTeamIds: readonly string[],
  now: Date,
) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const acting = new Set(actingTeamIds);
  const roster = new Set([
    ...actingTeamIds,
    ...memberships.map((row) => row.teamId),
  ]);
  if (roster.size === 0) {
    return [];
  }
  const rows = await database.query.games.findMany({
    where: and(
      isNotNull(games.challengeId),
      inArray(
        games.id,
        database
          .select({ id: gameTeams.gameId })
          .from(gameTeams)
          .where(inArray(gameTeams.teamId, [...roster])),
      ),
    ),
    with: {
      venue: { columns: { name: true } },
      matches: {
        columns: {
          status: true,
          slot1GameTeamId: true,
          slot2GameTeamId: true,
        },
        with: {
          sets: {
            columns: {
              setNumber: true,
              slot1GamesWon: true,
              slot2GamesWon: true,
            },
          },
        },
      },
    },
  });
  const views = await Promise.all(
    rows.map(async (game) => {
      const sides = (await loadChallengeSides(database, game)) ?? [];
      const side =
        sides.find((candidate) => acting.has(candidate.teamId ?? "")) ??
        sides.find((candidate) => roster.has(candidate.teamId ?? ""));
      const other = sides.find(
        (candidate) => candidate.gameTeamId !== side?.gameTeamId,
      );
      if (!game.challengeId || !game.windowStart || !side?.teamId) {
        return null;
      }
      const match = game.matches.find(
        (candidate) => candidate.status !== "cancelled",
      );
      const ourSlot = match?.slot2GameTeamId === side.gameTeamId ? 2 : 1;
      const sets = [...(match?.sets ?? [])]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((set) =>
          ourSlot === 1
            ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
            : { us: set.slot2GamesWon, them: set.slot1GamesWon },
        );
      const cancelled = game.cancelledAt != null;
      const shortSide =
        side.squadState === "empty" || side.squadState === "partial";
      return {
        challengeId: game.challengeId,
        gameId: game.id,
        sport: game.sport ?? "padel",
        startsAt: game.windowStart,
        played:
          match?.status === "completed" ||
          (game.windowEnd ?? game.windowStart).getTime() <= now.getTime(),
        cancelled,
        venue: game.venue ? { name: game.venue.name } : null,
        teamId: side.teamId,
        opponentTeamId: other?.teamId ?? "",
        squadState: side.squadState,
        nameYourSquad: acting.has(side.teamId) && shortSide && !cancelled,
        sets,
      };
    }),
  );
  return views.filter((view) => view != null);
}

type ChallengeGameView = Awaited<ReturnType<typeof loadChallengeGames>>[number];

function challengeGameItem(
  game: ChallengeGameView & {
    team: { id: string; displayName: string };
    opponent: { id: string; displayName: string };
  },
) {
  return {
    challengeId: game.challengeId,
    gameId: game.gameId,
    sport: game.sport,
    startsAt: game.startsAt,
    team: game.team,
    opponent: game.opponent,
    venue: game.venue,
    cancelled: game.cancelled,
    squadState: game.squadState,
    nameYourSquad: game.nameYourSquad,
    sets: game.sets,
  };
}

/**
 * The Mine segment, in display order: Proposals waiting on the viewer's Teams
 * as poster (soonest to lapse first), then those Teams' open Challenges, then
 * the viewer's Teams' pending Proposals, then the Challenge Games still to
 * play of every Team the viewer is on, then the last ten played. Read-time
 * clocks apply, so nothing expired shows. `posted` stays for clients that read the posted section alone.
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
            with: {
              challenge: {
                columns: { status: true, teamId: true, sport: true },
              },
            },
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

  const [waiting, sent] = await Promise.all([
    loadProposalViews(database, waitingRows),
    loadProposalViews(database, sentRows),
  ]);
  const challengeGames = await loadChallengeGames(
    database,
    args.userId,
    teamIds,
    now,
  );
  const names = await loadTeamDisplayNames(database, [
    ...pendingRows.map((proposal) => proposal.challenge.teamId),
    ...challengeGames.flatMap((game) => [game.teamId, game.opponentTeamId]),
  ]);
  const teamName = (teamId: string) =>
    names.get(teamId) ?? teamDisplayName(null, []);
  const challengeOf = (challengeId: string) =>
    pendingRows.find((proposal) => proposal.challengeId === challengeId)
      ?.challenge;
  const posterOf = (challengeId: string) =>
    challengeOf(challengeId)?.teamId ?? "";
  const sportOf = (challengeId: string) =>
    challengeOf(challengeId)?.sport ?? null;

  const games = challengeGames.map((game) => ({
    ...game,
    team: { id: game.teamId, displayName: teamName(game.teamId) },
    opponent: {
      id: game.opponentTeamId,
      displayName: teamName(game.opponentTeamId),
    },
  }));
  const accepted = games
    .filter((game) => !game.played)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const played = games
    .filter((game) => game.played)
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, PLAYED_LIMIT);

  const items = [
    ...waiting.map((proposal) => ({
      kind: "waiting" as const,
      key: `waiting:${proposal.id}`,
      challengeId: proposal.challengeId,
      sport: sportOf(proposal.challengeId),
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
      sport: sportOf(proposal.challengeId),
      posterTeam: {
        id: posterOf(proposal.challengeId),
        displayName: teamName(posterOf(proposal.challengeId)),
      },
      proposal,
    })),
    ...accepted.map((game) => ({
      kind: "accepted" as const,
      key: `accepted:${game.challengeId}`,
      ...challengeGameItem(game),
    })),
    ...played.map((game) => ({
      kind: "played" as const,
      key: `played:${game.challengeId}`,
      ...challengeGameItem(game),
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
