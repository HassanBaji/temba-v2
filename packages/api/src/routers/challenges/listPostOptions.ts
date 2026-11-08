import { and, eq, inArray } from "drizzle-orm";

import { challenges, teamMembers } from "@repo/db";
import { CHALLENGE_CARD_TILES } from "@repo/domain/challenge-card";
import { CHALLENGE_DEFAULT_DURATION_MINUTES } from "@repo/domain/challenge-form";
import { formatsPlayable, teamRosterRule } from "@repo/domain/team-roster";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { liveVenuesOfferingSport } from "#src/challenges/venues-for-sport";
import { type db } from "#src/db";
import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels } from "#src/teams/team-level";
import { loadTeamMatches, teamRecordFromMatches } from "#src/teams/team-record";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * For the post form: the viewer's Teams that may post now (padel with both
 * players, football with a Roster of five or more, listing the Formats it can
 * field, neither with an open Challenge), the Venues offering each sport, and
 * the default Game length. Each Team carries what its review card shows.
 */
export async function listPostOptions(
  database: DbClient,
  args: { userId: string; now?: Date },
) {
  const now = args.now ?? new Date();
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
    loadTeamLevels(database, postable, now),
    loadTeamMatches(
      database,
      postable.map((team) => team.id),
    ),
    liveVenuesOfferingSport(database, "padel"),
    liveVenuesOfferingSport(database, "football"),
  ]);

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
        })),
        teamLevel: levels.get(team.id) ?? null,
        record: teamRecordFromMatches(matches.get(team.id) ?? []),
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
