import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityJoinRequests,
  communityMembers,
  CommunityRoleEnum,
  groupMembers,
  groups,
  teamMembers,
  teams,
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
  venues,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { asJoinStatus } from "~/server/communities/helpers/as-join-status";
import { asRole } from "~/server/communities/helpers/as-role";
import { asVenueLinkStatus } from "~/server/communities/helpers/as-venue-link-status";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type VenueLinkRequest } from "~/server/communities/utils";
import { type db } from "~/server/db";
import { isStaffRole } from "~/server/games/access";
import { consult } from "~/server/soft-archive";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";

type DbClient = typeof db;

async function countOwners(database: DbClient, communityId: string) {
  const owners = await database.query.communityMembers.findMany({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.role, CommunityRoleEnum.OWNER),
    ),
  });

  return owners.length;
}

async function loadMemberVenue(database: DbClient, venueId: string | null) {
  if (!venueId) {
    return null;
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      logoImageUrl: true,
      archivedAt: true,
    },
    with: {
      courts: {
        columns: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
  });

  return venue ?? null;
}

function mapVenueLinkRequestRow(row: {
  id: string;
  status: string;
  createdAt: Date;
  venue: { id: string; name: string; city: string; country: string };
}): VenueLinkRequest {
  return {
    id: row.id,
    status: asVenueLinkStatus(row.status),
    createdAt: row.createdAt,
    venue: {
      id: row.venue.id,
      name: row.venue.name,
      city: row.venue.city,
      country: row.venue.country,
    },
  };
}

export async function communityById(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, args.communityId),
    with: {
      sports: true,
    },
  });

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const membership = await requireMembership(
    database,
    community.id,
    args.userId,
  );

  const joinRequest = await database.query.communityJoinRequests.findFirst({
    where: and(
      eq(communityJoinRequests.communityId, community.id),
      eq(communityJoinRequests.userId, args.userId),
    ),
  });

  const archive = consult({ archivedAt: community.archivedAt });
  const live = !archive.freeze("host");
  const canManageJoinRequests =
    community.type === "public" && live && isStaffRole(membership?.role);
  const canManageInvites =
    community.type === "private" && live && isStaffRole(membership?.role);
  const canManageLookupInvites = live && isStaffRole(membership?.role);
  const canManageInviteLinks = live && isStaffRole(membership?.role);
  const canCreateClubGroup = live && isStaffRole(membership?.role);
  const canManageSports = isStaffRole(membership?.role);
  const canManageRoles = membership?.role === "owner";
  const canSoftArchive = live && isStaffRole(membership?.role);
  const canUnarchive =
    archive.phase === "archived" && isStaffRole(membership?.role);
  const canManageTeamLinks = live && isStaffRole(membership?.role);
  const canManageVenueLink = live && isStaffRole(membership?.role);

  const venue = membership
    ? await loadMemberVenue(database, community.venueId)
    : null;

  let venueLinkRequest: ReturnType<typeof mapVenueLinkRequestRow> | null = null;
  if (isStaffRole(membership?.role)) {
    const pendingRequest = await database.query.venueLinkRequests.findFirst({
      where: and(
        eq(venueLinkRequests.communityId, community.id),
        eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
      ),
      with: {
        venue: {
          columns: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });
    if (pendingRequest) {
      venueLinkRequest = mapVenueLinkRequestRow(pendingRequest);
    } else {
      const lastRejected = await database.query.venueLinkRequests.findFirst({
        where: and(
          eq(venueLinkRequests.communityId, community.id),
          eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.REJECTED),
        ),
        with: {
          venue: {
            columns: {
              id: true,
              name: true,
              city: true,
              country: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
      if (lastRejected) {
        venueLinkRequest = mapVenueLinkRequestRow(lastRejected);
      }
    }
  }

  const canRequestVenueLink =
    canManageVenueLink &&
    !community.venueId &&
    venueLinkRequest?.status !== "pending";
  const canUnlinkVenue = canManageVenueLink && Boolean(community.venueId);

  let canLeave = Boolean(membership);
  let linkedTeamBlocksLeave = false;
  if (membership?.role === "owner") {
    const ownerCount = await countOwners(database, community.id);
    if (ownerCount <= 1) {
      canLeave = false;
    }
  }

  if (membership) {
    const teamSeats = await database.query.teamMembers.findMany({
      where: eq(teamMembers.userId, args.userId),
      columns: { teamId: true },
    });
    const teamIds = teamSeats.map((row) => row.teamId);
    if (teamIds.length > 0) {
      const linkedSeat = await database.query.teams.findFirst({
        where: and(
          eq(teams.communityId, community.id),
          inArray(teams.id, teamIds),
        ),
        columns: { id: true },
      });
      if (linkedSeat) {
        linkedTeamBlocksLeave = true;
        canLeave = false;
      }
    }
  }

  const clubGroups = await database.query.groups.findMany({
    where: eq(groups.communityId, community.id),
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  const linkedTeamRows = membership
    ? await database.query.teams.findMany({
        where: eq(teams.communityId, community.id),
        orderBy: (table, { asc }) => [asc(table.name)],
      })
    : [];

  const memberGroupIds = new Set<string>();
  if (clubGroups.length > 0) {
    const myGroupMemberships = await database.query.groupMembers.findMany({
      where: and(
        eq(groupMembers.userId, args.userId),
        inArray(
          groupMembers.groupId,
          clubGroups.map((group) => group.id),
        ),
      ),
    });
    for (const row of myGroupMemberships) {
      memberGroupIds.add(row.groupId);
    }
  }

  const linkedTeamIds = linkedTeamRows.map((team) => team.id);
  const linkedTeamMemberRows =
    linkedTeamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, linkedTeamIds),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });
  const linkedMembersByTeam = new Map<
    string,
    { name: string; image: string | null }[]
  >();
  for (const row of linkedTeamMemberRows) {
    const list = linkedMembersByTeam.get(row.teamId) ?? [];
    list.push({ name: row.user.name, image: row.user.image });
    linkedMembersByTeam.set(row.teamId, list);
  }

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    type: community.type,
    archivedAt: community.archivedAt,
    createdAt: community.createdAt,
    sports: community.sports.map(
      (sportRow) => sportRow.sport as GroupSportEnum,
    ),
    membership: membership
      ? { role: asRole(membership.role), userId: args.userId }
      : null,
    joinRequest: joinRequest
      ? {
          id: joinRequest.id,
          status: asJoinStatus(joinRequest.status),
        }
      : null,
    canManageJoinRequests,
    canManageInvites,
    canManageLookupInvites,
    canManageInviteLinks,
    canCreateClubGroup,
    canManageSports,
    canManageRoles,
    canSoftArchive,
    canUnarchive,
    canLeave,
    linkedTeamBlocksLeave,
    canManageTeamLinks,
    canManageVenueLink,
    canRequestVenueLink,
    canUnlinkVenue,
    venue,
    venueLinkRequest,
    groups: clubGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      sport: group.sport as GroupSportEnum | null,
      isMember: memberGroupIds.has(group.id),
    })),
    teams: linkedTeamRows.map((team) => ({
      id: team.id,
      name: team.name,
      displayName: teamDisplayName(
        team.name,
        (linkedMembersByTeam.get(team.id) ?? []).map((member) => member.name),
      ),
      sport: team.sport as GroupSportEnum,
      members: linkedMembersByTeam.get(team.id) ?? [],
    })),
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return communityById(ctx.db, {
      communityId: input.id,
      userId: appUser.id,
    });
  });
