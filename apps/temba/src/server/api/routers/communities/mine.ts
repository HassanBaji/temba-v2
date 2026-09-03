import { and, eq, inArray } from "drizzle-orm";

import {
  communityMembers,
  groupMembers,
  groups,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { asRole } from "~/server/communities/helpers/as-role";
import { type db } from "~/server/db";

type DbClient = typeof db;

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

  const clubGroups =
    communityIds.length > 0
      ? await database.query.groups.findMany({
          where: inArray(groups.communityId, communityIds),
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

  const groupsByCommunityId = new Map<string, typeof clubGroups>();
  for (const group of clubGroups) {
    if (!group.communityId) {
      continue;
    }
    const nested = groupsByCommunityId.get(group.communityId) ?? [];
    nested.push(group);
    groupsByCommunityId.set(group.communityId, nested);
  }

  return memberships.map((membership) => ({
    id: membership.community.id,
    name: membership.community.name,
    description: membership.community.description,
    type: membership.community.type,
    role: asRole(membership.role),
    sports: membership.community.sports.map(
      (sportRow) => sportRow.sport as GroupSportEnum,
    ),
    archivedAt: membership.community.archivedAt,
    groups: (groupsByCommunityId.get(membership.community.id) ?? []).map(
      (group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        sport: group.sport as GroupSportEnum | null,
        isMember: memberGroupIds.has(group.id),
      }),
    ),
  }));
}

export const mineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return mine(ctx.db, { userId: appUser.id });
});
