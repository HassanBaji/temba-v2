import { and, eq, inArray } from "drizzle-orm";

import {
  challengeProposals,
  challengeVenues,
  teamMembers,
  teams,
  user,
  type challenges,
} from "@repo/db";
import { CHALLENGE_CARD_TILES } from "@repo/domain/challenge-card";
import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";

import {
  loadViewerTeams,
  viewerEligibility,
} from "#src/challenges/challenge-eligibility";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels } from "#src/teams/team-level";
import { loadTeamMatches, teamRecordFromMatches } from "#src/teams/team-record";
import { type db } from "#src/db";

type ChallengeRow = typeof challenges.$inferSelect;

/** The board's state of a Challenge: `open` past expiry reads `expired` until the job stamps it. */
export type ChallengeState = "open" | "confirmed" | "expired" | "withdrawn";

/**
 * Everything a card and the detail's open state read: the poster Team, its
 * Team Level and record, preferred Venues, pending Proposals, and the viewer's
 * eligible Teams. Read-time expiry is applied here.
 */
export async function loadChallengeCards(
  database: typeof db,
  rows: readonly ChallengeRow[],
  args: { userId: string; now: Date },
) {
  if (rows.length === 0) {
    return [];
  }
  const challengeIds = rows.map((row) => row.id);
  const teamIds = [...new Set(rows.map((row) => row.teamId))];

  const [venueRows, proposalRows, teamRows, memberRows, posters] =
    await Promise.all([
      database.query.challengeVenues.findMany({
        where: inArray(challengeVenues.challengeId, challengeIds),
        with: { venue: { columns: { id: true, name: true, city: true } } },
        orderBy: (table, { asc }) => [asc(table.rank)],
      }),
      database.query.challengeProposals.findMany({
        where: and(
          inArray(challengeProposals.challengeId, challengeIds),
          eq(challengeProposals.status, "pending"),
        ),
        columns: { challengeId: true, status: true, expiresAt: true },
      }),
      database.query.teams.findMany({ where: inArray(teams.id, teamIds) }),
      database.query.teamMembers.findMany({
        where: inArray(teamMembers.teamId, teamIds),
        columns: { teamId: true, userId: true },
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      }),
      database.query.user.findMany({
        where: inArray(user.id, [...new Set(rows.map((row) => row.postedBy))]),
        columns: { id: true, name: true },
      }),
    ]);

  const [levels, matches, viewerTeams] = await Promise.all([
    loadTeamLevels(database, teamRows, args.now),
    loadTeamMatches(database, teamIds),
    loadViewerTeams(database, args.userId, args.now),
  ]);

  return rows.map((row) => {
    const team = teamRows.find((candidate) => candidate.id === row.teamId);
    const roster = memberRows.filter((member) => member.teamId === row.teamId);
    const pending = proposalRows.filter(
      (proposal) =>
        proposal.challengeId === row.id &&
        isProposalPending(proposal, args.now),
    ).length;
    const open = isChallengeOpen(row, args.now, pending > 0);
    const state: ChallengeState =
      row.status === "open" && !open ? "expired" : row.status;
    const poster = posters.find((candidate) => candidate.id === row.postedBy);
    const viewer = viewerEligibility(
      row,
      roster.map((member) => member.userId),
      viewerTeams,
    );
    return {
      id: row.id,
      state,
      sport: row.sport,
      sideSize: row.sideSize,
      levelMinTenths: row.levelMinTenths,
      levelMaxTenths: row.levelMaxTenths,
      days: row.days,
      timings: row.timings,
      exactSlots: row.exactSlots,
      durationMinutes: row.durationMinutes,
      note: row.note,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      proposalCount: pending,
      venues: venueRows
        .filter((venue) => venue.challengeId === row.id)
        .map((venue) => venue.venue),
      team: {
        id: row.teamId,
        displayName: teamDisplayName(
          team?.name ?? null,
          roster.map((member) => member.user.name),
        ),
        rosterCount: roster.length,
        members: roster.slice(0, CHALLENGE_CARD_TILES).map((member) => ({
          userId: member.user.id,
          name: member.user.name,
          image: member.user.image,
        })),
        teamLevel: levels.get(row.teamId) ?? null,
        record: teamRecordFromMatches(matches.get(row.teamId) ?? []),
      },
      postedBy: { id: row.postedBy, name: poster?.name ?? null },
      viewer: open
        ? viewer
        : { ...viewer, eligibleTeams: [], ineligibleReason: null },
    };
  });
}

export type ChallengeCard = Awaited<
  ReturnType<typeof loadChallengeCards>
>[number];
