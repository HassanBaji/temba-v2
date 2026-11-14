import { and, eq, inArray } from "drizzle-orm";

import { challenges, teamMembers, teams } from "@repo/db";
import { CHALLENGE_CARD_TILES } from "@repo/domain/challenge-card";
import { CHALLENGE_DEFAULT_DURATION_MINUTES } from "@repo/domain/challenge-form";
import { formatsPlayable, teamRosterRule } from "@repo/domain/team-roster";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadTeamDisplayNames } from "#src/challenges/challenge-proposals";
import { liveVenuesOfferingSport } from "#src/challenges/venues-for-sport";
import { type db } from "#src/db";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels } from "#src/teams/team-level";
import {
  loadTeamMatches,
  teamRecordFromMatches,
  type TeamMatch,
} from "#src/teams/team-record";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** Each opponent Team once, with its last Match against this Team; most recent first. */
function lastMatchByOpponent(teamMatches: readonly TeamMatch[]) {
  const last = new Map<string, TeamMatch>();
  for (const match of teamMatches) {
    if (match.opponentTeamId) {
      last.set(match.opponentTeamId, match);
    }
  }
  return [...last.values()].sort(
    (a, b) => b.playedAt.getTime() - a.playedAt.getTime(),
  );
}

/**
 * For the post form: the viewer's Teams that may post now (padel with both
 * players, football with a Roster of five or more, listing the Formats it can
 * field, neither with an open Challenge), the Venues offering each sport, and
 * the default Game length. Each Team carries what its review card shows, and
 * the Teams it has played, which a Rematch is sent to and pre-filled from:
 * the last Game's Side size and Venue, and the opponent's Team Level.
 */
export async function listPostOptions(
  database: DbClient,
  args: { userId: string; now?: Date },
) {
  const acting = await teamsUserActsFor(database, args.userId);
  const teamIds = acting.map((team) => team.id);
  const [members, openRows] =
    teamIds.length === 0
      ? [[], []]
      : await Promise.all([
          database.query.teamMembers.findMany({
            where: inArray(teamMembers.teamId, teamIds),
            columns: { teamId: true },
            with: { user: { columns: { id: true, name: true, image: true } } },
            orderBy: (table, { asc }) => [asc(table.createdAt)],
          }),
          database.query.challenges.findMany({
            where: and(
              inArray(challenges.teamId, teamIds),
              eq(challenges.status, "open"),
            ),
            columns: { teamId: true },
          }),
        ]);
  const withOpen = new Set(openRows.map((row) => row.teamId));
  const postable = acting.filter((team) => {
    const count = members.filter((member) => member.teamId === team.id).length;
    return (
      !withOpen.has(team.id) && count >= teamRosterRule(team.sport).completeAt
    );
  });
  const [levels, matches, padelVenues, footballVenues] = await Promise.all([
    loadTeamLevels(database, postable),
    loadTeamMatches(
      database,
      postable.map((team) => team.id),
    ),
    liveVenuesOfferingSport(database, "padel"),
    liveVenuesOfferingSport(database, "football"),
  ]);
  const opponentIds = [
    ...new Set(
      [...matches.values()].flatMap((list) =>
        list.flatMap((match) =>
          match.opponentTeamId ? [match.opponentTeamId] : [],
        ),
      ),
    ),
  ];
  const opponentRows =
    opponentIds.length === 0
      ? []
      : await database.query.teams.findMany({
          where: inArray(teams.id, opponentIds),
          columns: { id: true, sport: true },
        });
  const [opponentNames, opponentLevels] = await Promise.all([
    loadTeamDisplayNames(database, opponentIds),
    loadTeamLevels(database, opponentRows),
  ]);
  const playedTeams = (team: (typeof postable)[number]) =>
    lastMatchByOpponent(matches.get(team.id) ?? []).flatMap((match) => {
      const opponent = opponentRows.find(
        (row) => row.id === match.opponentTeamId,
      );
      if (opponent?.sport !== team.sport) {
        return [];
      }
      return [
        {
          id: opponent.id,
          displayName: opponentNames.get(opponent.id) ?? null,
          teamLevel: opponentLevels.get(opponent.id) ?? null,
          lastGame: {
            playedAt: match.playedAt,
            sideSize: match.sideSize,
            venueId: match.venueId,
          },
        },
      ];
    });

  return {
    teams: postable.map((team) => {
      const roster = members.filter((member) => member.teamId === team.id);
      return {
        id: team.id,
        displayName: teamDisplayName(
          team.name,
          roster.map((member) => member.user.name),
        ),
        sport: team.sport,
        rosterCount: roster.length,
        formatsPlayable:
          team.sport === "football" ? formatsPlayable(roster.length) : [],
        members: roster.slice(0, CHALLENGE_CARD_TILES).map((member) => ({
          userId: member.user.id,
          name: member.user.name,
          image: member.user.image,
          isViewer: member.user.id === args.userId,
        })),
        teamLevel: levels.get(team.id) ?? null,
        record: teamRecordFromMatches(matches.get(team.id) ?? []),
        playedTeams: playedTeams(team),
      };
    }),
    venues: { padel: padelVenues, football: footballVenues },
    defaultDurationMinutes: CHALLENGE_DEFAULT_DURATION_MINUTES,
  };
}

export const listPostOptionsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listPostOptions(ctx.db, { userId: appUser.id });
  },
);
