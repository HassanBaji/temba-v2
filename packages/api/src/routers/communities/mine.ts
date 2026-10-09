import type { DbClient } from "@repo/db";
import { and, count, eq, inArray } from "drizzle-orm";

import {
  communityMembers,
  groupMembers,
  groups,
  venues,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { asRole } from "#src/communities/helpers/as-role";
import { groupMemberCounts } from "#src/communities/helpers/group-member-counts";

async function communityMemberCounts(
  database: DbClient,
  communityIds: string[],
) {
  const counts = new Map<string, number>();
  if (communityIds.length === 0) {
    return counts;
  }
  const rows = await database
    .select({
      communityId: communityMembers.communityId,
      memberCount: count(),
    })
    .from(communityMembers)
    .where(inArray(communityMembers.communityId, communityIds))
    .groupBy(communityMembers.communityId);
  for (const row of rows) {
    counts.set(row.communityId, Number(row.memberCount));
  }
  return counts;
}

async function venueLogosById(database: DbClient, venueIds: string[]) {
  const logos = new Map<string, string | null>();
  if (venueIds.length === 0) {
    return logos;
  }
  const rows = await database.query.venues.findMany({
    where: inArray(venues.id, venueIds),
    columns: { id: true, logoImageUrl: true },
  });
  for (const row of rows) {
    logos.set(row.id, row.logoImageUrl);
  }
  return logos;
}

export async function mine(database: DbClient, args: { userId: string }) {
  const memberships = await database.query.communityMembers.findMany({
    where: eq(communityMembers.userId, args.userId),
    with: {
      community: {
        with: {
          sports: true,
        },
      },
    },
  });

  const communityIds = memberships.map((membership) => membership.community.id);
  const venueIds = [
    ...new Set(
      memberships
        .map((membership) => membership.community.venueId)
        .filter((venueId): venueId is string => venueId !== null),
    ),
  ];

  const [clubGroups, memberCountByCommunity, logoByVenue] = await Promise.all([
    communityIds.length > 0
      ? database.query.groups.findMany({
          where: inArray(groups.communityId, communityIds),
          orderBy: (table, { asc }) => [asc(table.name)],
        })
      : Promise.resolve([]),
    communityMemberCounts(database, communityIds),
    venueLogosById(database, venueIds),
  ]);

  const clubGroupIds = clubGroups.map((group) => group.id);

  const memberGroupIds = new Set<string>();
  const [myGroupMemberships, memberCountByGroup] = await Promise.all([
    clubGroupIds.length > 0
      ? database.query.groupMembers.findMany({
          where: and(
            eq(groupMembers.userId, args.userId),
            inArray(groupMembers.groupId, clubGroupIds),
          ),
        })
      : Promise.resolve([]),
    groupMemberCounts(database, clubGroupIds),
  ]);
  for (const row of myGroupMemberships) {
    memberGroupIds.add(row.groupId);
  }

  const groupsByCommunityId = new Map<string, typeof clubGroups>();
  for (const group of clubGroups) {
    if (!group.communityId) {
      continue;
    }
    const nested = groupsByCommunityId.get(group.communityId) ?? [];
    nested.push(group);
    groupsByCommunityId.set(group.communityId, nested);
  }

  return memberships.map((membership) => {
    const community = membership.community;
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      type: community.type,
      role: asRole(membership.role),
      sports: community.sports.map(
        (sportRow) => sportRow.sport as GroupSportEnum,
      ),
      archivedAt: community.archivedAt,
      memberCount: memberCountByCommunity.get(community.id) ?? 0,
      logoImageUrl: community.venueId
        ? (logoByVenue.get(community.venueId) ?? null)
        : null,
      groups: (groupsByCommunityId.get(community.id) ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        sport: group.sport as GroupSportEnum | null,
        isMember: memberGroupIds.has(group.id),
        memberCount: memberCountByGroup.get(group.id) ?? 0,
        imageUrl: group.imageUrl ?? null,
      })),
    };
  });
}

export const mineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return mine(ctx.db, { userId: appUser.id });
});
