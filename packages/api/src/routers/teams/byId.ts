import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  gameTeams,
  groupMembers,
  groups,
  ratings,
  teamMembers,
  teams,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { type LevelBand } from "@repo/domain/level-bands";
import {
  formatsPlayable,
  teamIsComplete,
  teamIsFull,
  teamIsSquad,
  teamRosterRule,
} from "@repo/domain/team-roster";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { appointedOrganizerGroupIds } from "#src/groups/helpers/appointed-organizers";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireTeam } from "#src/teams/helpers/require-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import {
  loadTeamMatches,
  teamFormFromMatches,
  teamRecordFromMatches,
  teamRivalsFromMatches,
} from "#src/teams/team-record";

type DbClient = typeof db;

const RECENT_GAMES_SHOWN = 10;

async function loadTeamNames(database: DbClient, teamIds: readonly string[]) {
  if (teamIds.length === 0) {
    return new Map<string, string>();
  }
  const rows = await database.query.teams.findMany({
    where: inArray(teams.id, [...teamIds]),
    columns: { id: true, name: true },
  });
  const memberRows = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, [...teamIds]),
    columns: { teamId: true },
    with: { user: { columns: { name: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  return new Map(
    rows.map((row) => [
      row.id,
      teamDisplayName(
        row.name,
        memberRows
          .filter((member) => member.teamId === row.id)
          .map((member) => member.user.name),
      ),
    ]),
  );
}

async function loadMemberLevels(
  database: DbClient,
  sport: GroupSportEnum,
  userIds: readonly string[],
) {
  const levels = new Map<string, { level: string; levelBand: LevelBand }>();
  if (userIds.length === 0) {
    return levels;
  }
  const rows = await database.query.ratings.findMany({
    where: and(eq(ratings.sport, sport), inArray(ratings.userId, [...userIds])),
  });
  const now = new Date();
  for (const row of rows) {
    const view = youRatingViewAfterIdle(row, now);
    levels.set(row.userId, { level: view.level, levelBand: view.levelBand });
  }
  return levels;
}

/** Live Groups of the sport the viewer organizes, as creator or appointed. */
async function organizedGroups(
  database: DbClient,
  sport: GroupSportEnum,
  userId: string,
) {
  const appointedIds = await appointedOrganizerGroupIds(database, userId);
  return database.query.groups.findMany({
    where: and(
      eq(groups.sport, sport),
      isNull(groups.deletedAt),
      appointedIds.length > 0
        ? or(eq(groups.createdBy, userId), inArray(groups.id, appointedIds))
        : eq(groups.createdBy, userId),
    ),
    columns: { id: true, name: true },
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}

/** A Team is tagged only to a Group its Captain is in. */
async function captainGroupIds(
  database: DbClient,
  captainUserId: string,
  groupIds: string[],
) {
  if (groupIds.length === 0) {
    return new Set<string>();
  }
  const rows = await database.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.userId, captainUserId),
      inArray(groupMembers.groupId, groupIds),
    ),
    columns: { groupId: true },
  });
  return new Set(rows.map((row) => row.groupId));
}

async function groupTagView(
  database: DbClient,
  team: { groupId: string | null; createdBy: string },
  sport: GroupSportEnum,
  userId: string,
) {
  const tagged = team.groupId
    ? await database.query.groups.findFirst({
        where: and(eq(groups.id, team.groupId), isNull(groups.deletedAt)),
        columns: { id: true, name: true, createdBy: true },
      })
    : undefined;
  const isCaptain = team.createdBy === userId;
  const canClear = tagged
    ? isCaptain || (await mayOrganizeGroupGames(database, tagged, userId))
    : false;
  const organized =
    tagged && !canClear
      ? []
      : (await organizedGroups(database, sport, userId)).filter(
          (group) => group.id !== tagged?.id,
        );
  const captainIn = await captainGroupIds(
    database,
    team.createdBy,
    organized.map((group) => group.id),
  );
  const options = organized.filter((group) => captainIn.has(group.id));
  return {
    groupTag: tagged ? { id: tagged.id, name: tagged.name } : null,
    canClearGroupTag: canClear,
    groupTagOptions: options,
  };
}

/**
 * The Team's Challenge Games, latest kick-off first, so the ones still to
 * play lead: each with the other Team and whether it was cancelled.
 */
async function loadChallengeGames(database: DbClient, teamId: string) {
  const sides = await database.query.gameTeams.findMany({
    where: eq(gameTeams.teamId, teamId),
    columns: { gameId: true },
    with: {
      game: {
        columns: {
          id: true,
          challengeId: true,
          windowStart: true,
          cancelledAt: true,
        },
        with: {
          venue: { columns: { name: true } },
          teams: { columns: { teamId: true } },
        },
      },
    },
  });
  return sides
    .flatMap(({ game }) =>
      game.challengeId && game.windowStart
        ? [
            {
              gameId: game.id,
              challengeId: game.challengeId,
              startsAt: game.windowStart,
              venueName: game.venue.name,
              cancelled: game.cancelledAt != null,
              opponentTeamId:
                game.teams.find(
                  (side) => side.teamId != null && side.teamId !== teamId,
                )?.teamId ?? null,
            },
          ]
        : [],
    )
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, RECENT_GAMES_SHOWN);
}

/**
 * Any signed-in User may open any Team: a Challenge shows the opposing Team's
 * record and Roster. Invites, dissolve and leave stay with members.
 */
export async function teamById(
  database: DbClient,
  args: { teamId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);
  const sport = team.sport as GroupSportEnum;

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  const isMember = Boolean(membership);

  const memberRows = await listTeamMembers(database, team.id);
  const memberNames = memberRows.map((row) => row.user.name);
  const incomplete = !teamIsComplete(memberRows.length, team.sport);
  const full = teamIsFull(memberRows.length, team.sport);
  const isCreator = team.createdBy === args.userId;
  const canInvite = isMember && !full && isCreator;
  const unusedInvite = canInvite
    ? ((await unusedLookupInvitesForTeam(database, team.id))[0] ?? null)
    : null;

  const canDissolve =
    isMember && (isCreator || (!incomplete && !teamIsSquad(team.sport)));
  const viewerCanLeave = isMember && !isCreator && teamIsSquad(team.sport);
  const viewerActsForTeam = await userActsForTeam(database, team, args.userId);
  const tag = await groupTagView(database, team, sport, args.userId);

  const teamMatches =
    (await loadTeamMatches(database, [team.id])).get(team.id) ?? [];
  const record = teamRecordFromMatches(teamMatches);
  const { rivals, closest } = teamRivalsFromMatches(teamMatches);
  const recentMatches = teamMatches.slice(-RECENT_GAMES_SHOWN).reverse();

  const challengeGames = await loadChallengeGames(database, team.id);
  const opponentNames = await loadTeamNames(database, [
    ...new Set(
      [
        ...teamMatches.map((match) => match.opponentTeamId),
        ...challengeGames.map((game) => game.opponentTeamId),
      ].filter((id): id is string => id != null),
    ),
  ]);
  const levels = await loadMemberLevels(
    database,
    sport,
    memberRows.map((row) => row.user.id),
  );

  const rivalView = (rival: (typeof rivals)[number]) => ({
    teamId: rival.teamId,
    name: opponentNames.get(rival.teamId) ?? null,
    played: rival.played,
    wins: rival.wins,
    draws: rival.draws,
    losses: rival.losses,
    lastResult: rival.lastResult,
    lastPlayedAt: rival.lastPlayedAt,
  });

  return {
    id: team.id,
    name: team.name,
    displayName: teamDisplayName(team.name, memberNames),
    sport,
    gamesPlayed: record.gamesPlayed,
    wins: record.wins,
    losses: record.losses,
    record,
    form: teamFormFromMatches(teamMatches),
    rivals: rivals.map(rivalView),
    closestRival: closest ? rivalView(closest) : null,
    games: recentMatches.map((match) => ({
      matchId: match.matchId,
      gameId: match.gameId,
      playedAt: match.playedAt,
      venueName: match.venueName,
      opponent: {
        teamId: match.opponentTeamId,
        name: match.opponentTeamId
          ? (opponentNames.get(match.opponentTeamId) ?? null)
          : match.opponentSideName,
      },
      sets: match.sets,
      result: match.result,
    })),
    challengeGames: challengeGames.map((game) => ({
      gameId: game.gameId,
      challengeId: game.challengeId,
      startsAt: game.startsAt,
      venueName: game.venueName,
      cancelled: game.cancelled,
      opponent: {
        teamId: game.opponentTeamId,
        name: game.opponentTeamId
          ? (opponentNames.get(game.opponentTeamId) ?? null)
          : null,
      },
    })),
    incomplete,
    waitingForPartner: incomplete,
    roster: {
      min: teamRosterRule(team.sport).min,
      max: teamRosterRule(team.sport).max,
      completeAt: teamRosterRule(team.sport).completeAt,
      count: memberRows.length,
      complete: !incomplete,
      full,
      formatsPlayable:
        sport === GroupSportEnum.FOOTBALL
          ? formatsPlayable(memberRows.length)
          : [],
    },
    groupTag: tag.groupTag,
    canClearGroupTag: tag.canClearGroupTag,
    groupTagOptions: tag.groupTagOptions,
    createdBy: team.createdBy,
    captainUserId: team.createdBy,
    createdAt: team.createdAt,
    viewerIsMember: isMember,
    viewerActsForTeam,
    membership: membership ? { id: membership.id } : null,
    members: memberRows.map((row) => {
      const unclaimed = isUnclaimed(row.user);
      return {
        id: row.id,
        userId: row.user.id,
        name: row.user.name,
        image: row.user.image,
        isCreator: row.user.id === team.createdBy,
        isViewer: row.user.id === args.userId,
        level: levels.get(row.user.id)?.level ?? null,
        levelBand: levels.get(row.user.id)?.levelBand ?? null,
        preferredPosition: row.user.preferredPosition,
        footballRole: row.user.preferredFootballRole,
        footballPosition: row.user.preferredFootballPosition,
        unclaimed,
        // Only the Captain, who added them, sees whose number it is.
        phoneMasked:
          unclaimed && isCreator && row.user.phoneNumber
            ? maskPhone(row.user.phoneNumber)
            : null,
        removable: unclaimed && isCreator && isMember,
      };
    }),
    canInvite,
    canDissolve,
    viewerCanLeave,
    unusedInvite:
      canInvite && unusedInvite
        ? {
            id: unusedInvite.id,
            createdAt: unusedInvite.createdAt,
            user: unusedInvite.user,
          }
        : null,
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return teamById(ctx.db, { teamId: input.id, userId: appUser.id });
  });
