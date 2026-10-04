import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  gameTeams,
  matches,
  MatchStatusEnum,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import { consult } from "~/server/soft-archive";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import { unusedInviteForTeam } from "~/server/teams/helpers/unused-invite-for-team";

type DbClient = typeof db;

type TeamRecord = {
  gamesPlayed: number;
  wins: number;
  losses: number;
};

type TeamRecordMatch = {
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

/**
 * Record of one Team across its completed Matches, given the ids of the Game
 * teams the Team sat as. A draw is played, neither won nor lost.
 */
function teamRecordFromMatches(
  matchesOfTeam: readonly TeamRecordMatch[],
  teamGameTeamIds: ReadonlySet<string>,
): TeamRecord {
  const record: TeamRecord = { gamesPlayed: 0, wins: 0, losses: 0 };
  for (const match of matchesOfTeam) {
    const slot = teamGameTeamIds.has(match.slot1GameTeamId ?? "")
      ? 1
      : teamGameTeamIds.has(match.slot2GameTeamId ?? "")
        ? 2
        : null;
    if (slot === null) {
      continue;
    }
    record.gamesPlayed += 1;
    const { result } = matchOutcome(match.sets);
    if (result === "slot1" || result === "slot2") {
      if (result === `slot${slot}`) {
        record.wins += 1;
      } else {
        record.losses += 1;
      }
    }
  }
  return record;
}

/**
 * Derived on every read from the completed Matches of the Team's non-cancelled
 * Games. A Match awaiting confirmation and a Walkover (a cancelled Match) do
 * not count. There are no stored counters.
 */
async function loadTeamRecord(
  database: DbClient,
  teamId: string,
): Promise<TeamRecord> {
  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.teamId, teamId),
    columns: { id: true },
  });
  const gameTeamIds = teamRows.map((row) => row.id);
  if (gameTeamIds.length === 0) {
    return { gamesPlayed: 0, wins: 0, losses: 0 };
  }

  const completed = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, gameTeamIds),
        inArray(matches.slot2GameTeamId, gameTeamIds),
      ),
    ),
    columns: { slot1GameTeamId: true, slot2GameTeamId: true },
    with: {
      game: { columns: { cancelledAt: true } },
      sets: { columns: { slot1GamesWon: true, slot2GamesWon: true } },
    },
  });

  return teamRecordFromMatches(
    completed.filter((match) => match.game?.cancelledAt == null),
    new Set(gameTeamIds),
  );
}

export async function teamById(
  database: DbClient,
  args: { teamId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  let communityMembership = null;
  let community = null;

  if (team.communityId) {
    community = await database.query.communities.findFirst({
      where: eq(communities.id, team.communityId),
    });
    communityMembership = await database.query.communityMembers.findFirst({
      where: and(
        eq(communityMembers.communityId, team.communityId),
        eq(communityMembers.userId, args.userId),
      ),
    });
  }

  const isMember = Boolean(membership);
  const canOpenLinkedAsCommunityMember = Boolean(
    team.communityId && communityMembership,
  );

  if (!isMember && !canOpenLinkedAsCommunityMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot open this Team",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  const memberNames = memberRows.map((row) => row.user.name);
  const incomplete = memberRows.length < 2;
  const canInvite =
    isMember &&
    incomplete &&
    team.createdBy === args.userId &&
    !consult({ archivedAt: community?.archivedAt ?? null }).freeze("host");
  const unusedInvite = canInvite
    ? await unusedInviteForTeam(database, team.id)
    : null;

  const canDissolve =
    isMember && (team.createdBy === args.userId || !incomplete);

  const pendingLinkRequest = isMember
    ? await database.query.teamLinkRequests.findFirst({
        where: and(
          eq(teamLinkRequests.teamId, team.id),
          eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
        ),
        with: {
          community: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      })
    : null;

  const record = await loadTeamRecord(database, team.id);

  const canRequestLink =
    isMember && !incomplete && !team.communityId && !pendingLinkRequest;
  const canUnlink = isMember && Boolean(team.communityId);

  return {
    id: team.id,
    name: team.name,
    displayName: teamDisplayName(team.name, memberNames),
    sport: team.sport as GroupSportEnum,
    communityId: team.communityId,
    isLoose: !team.communityId,
    linkState: team.communityId ? ("linked" as const) : ("unattached" as const),
    gamesPlayed: record.gamesPlayed,
    wins: record.wins,
    losses: record.losses,
    incomplete,
    waitingForPartner: incomplete,
    community: community
      ? {
          id: community.id,
          name: community.name,
          archivedAt: community.archivedAt,
        }
      : null,
    createdBy: team.createdBy,
    createdAt: team.createdAt,
    membership: membership ? { id: membership.id } : null,
    members: memberRows.map((row) => ({
      id: row.id,
      userId: row.user.id,
      name: row.user.name,
      image: row.user.image,
      isCreator: row.user.id === team.createdBy,
      isViewer: row.user.id === args.userId,
    })),
    canInvite,
    canDissolve,
    canRequestLink,
    canUnlink,
    pendingLinkRequest: pendingLinkRequest
      ? {
          id: pendingLinkRequest.id,
          community: pendingLinkRequest.community,
          createdAt: pendingLinkRequest.createdAt,
        }
      : null,
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
