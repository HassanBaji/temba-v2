import type { DbClient, DbTx } from "@repo/db";
import { inArray } from "drizzle-orm";

import {
  courts,
  teamMembers,
  teams,
  user,
  venues,
  type challengeProposals,
} from "@repo/db";

import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels } from "#src/teams/team-level";

type DbOrTx = DbClient | DbTx;

type ProposalRow = typeof challengeProposals.$inferSelect;

/** Each Team's name, or its members' names when it has none. */
export async function loadTeamDisplayNames(
  database: DbOrTx,
  teamIds: readonly string[],
) {
  const names = new Map<string, string>();
  if (teamIds.length === 0) {
    return names;
  }
  const ids = [...new Set(teamIds)];
  const teamRows = await database.query.teams.findMany({
    where: inArray(teams.id, ids),
    columns: { id: true, name: true },
  });
  const memberRows = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, ids),
    columns: { teamId: true },
    with: { user: { columns: { name: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  for (const team of teamRows) {
    names.set(
      team.id,
      teamDisplayName(
        team.name,
        memberRows
          .filter((member) => member.teamId === team.id)
          .map((member) => member.user.name),
      ),
    );
  }
  return names;
}

/** A face shows the first few Roster members, as the card's tiles do. */
const TEAM_FACE_MEMBERS = 6;

/**
 * Each Team as the Challenge detail and the Accept sheet draw it: crest name,
 * sport, Team Level, Roster size and its first members, with the viewer
 * marked so the line can say "you".
 */
export async function loadTeamFaces(
  database: DbOrTx,
  teamIds: readonly string[],
  args: { userId: string; now: Date },
) {
  const ids = [...new Set(teamIds)];
  if (ids.length === 0) {
    return [];
  }
  const teamRows = await database.query.teams.findMany({
    where: inArray(teams.id, ids),
    columns: { id: true, name: true, sport: true },
  });
  const memberRows = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, ids),
    columns: { teamId: true, userId: true },
    with: { user: { columns: { name: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  const levels = await loadTeamLevels(database, teamRows);
  return teamRows.map((team) => {
    const roster = memberRows.filter((member) => member.teamId === team.id);
    const level = levels.get(team.id) ?? null;
    return {
      id: team.id,
      displayName: teamDisplayName(
        team.name,
        roster.map((member) => member.user.name),
      ),
      sport: team.sport,
      rosterCount: roster.length,
      teamLevel: level
        ? { band: level.band, level: level.level, ovr: level.ovr }
        : null,
      members: roster.slice(0, TEAM_FACE_MEMBERS).map((member) => ({
        name: member.user.name,
        isViewer: member.userId === args.userId,
      })),
      viewerOnRoster: roster.some((member) => member.userId === args.userId),
    };
  });
}

export type TeamFace = Awaited<ReturnType<typeof loadTeamFaces>>[number];

/**
 * Proposals as the Challenge detail and Mine show them: the proposing Team,
 * who sent it, the Venue and Court, the start, the price, and its clock.
 * `sentAt` moves when the Proposal is changed.
 */
export async function loadProposalViews(
  database: DbOrTx,
  rows: readonly ProposalRow[],
) {
  if (rows.length === 0) {
    return [];
  }
  const venueIds = [...new Set(rows.map((row) => row.venueId))];
  const courtIds = [
    ...new Set(
      rows.map((row) => row.courtId).filter((id): id is string => id != null),
    ),
  ];
  const userIds = [...new Set(rows.map((row) => row.proposedBy))];

  const teamNames = await loadTeamDisplayNames(
    database,
    rows.map((row) => row.teamId),
  );
  const venueRows = await database.query.venues.findMany({
    where: inArray(venues.id, venueIds),
    columns: { id: true, name: true, city: true },
  });
  const courtRows =
    courtIds.length === 0
      ? []
      : await database.query.courts.findMany({
          where: inArray(courts.id, courtIds),
          columns: { id: true, name: true },
        });
  const proposers = await database.query.user.findMany({
    where: inArray(user.id, userIds),
    columns: { id: true, name: true },
  });

  return rows.map((row) => {
    const venue = venueRows.find((candidate) => candidate.id === row.venueId);
    const court = courtRows.find((candidate) => candidate.id === row.courtId);
    return {
      id: row.id,
      challengeId: row.challengeId,
      status: row.status,
      team: {
        id: row.teamId,
        displayName: teamNames.get(row.teamId) ?? teamDisplayName(null, []),
      },
      proposedBy: {
        id: row.proposedBy,
        name:
          proposers.find((candidate) => candidate.id === row.proposedBy)
            ?.name ?? null,
      },
      venue: {
        id: row.venueId,
        name: venue?.name ?? "",
        city: venue?.city ?? null,
      },
      court: court ? { id: court.id, name: court.name } : null,
      startsAt: row.startsAt,
      pricePerPlayerFils: row.pricePerPlayerFils,
      expiresAt: row.expiresAt,
      sentAt: row.updatedAt,
    };
  });
}

export type ProposalView = Awaited<
  ReturnType<typeof loadProposalViews>
>[number];
