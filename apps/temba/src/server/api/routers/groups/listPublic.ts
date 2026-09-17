import { and, eq, inArray, notInArray } from "drizzle-orm";

import { GroupSportEnum, GroupTypeEnum, groupMembers, groups } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  groupJoinMode,
  type GroupJoinMode,
} from "~/server/groups/helpers/group-join-mode";
import { consult } from "~/server/soft-archive";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export type PublicGroupJoinMode = Exclude<GroupJoinMode, "member" | "none">;

export type PublicGroupRow = {
  id: string;
  name: string | null;
  sport: typeof groups.$inferSelect.sport;
  communityName: string | null;
  memberCount: number;
  requiresApproval: boolean;
  joinMode: PublicGroupJoinMode;
  imageUrl: string | null;
};

const PUBLIC_LIST_LIMIT = 100;

function isPublicListJoinMode(
  mode: GroupJoinMode,
): mode is PublicGroupJoinMode {
  return mode === "join" || mode === "request" || mode === "requested";
}

export async function listPublic(
  database: DbClient,
  args: { userId: string },
): Promise<PublicGroupRow[]> {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    columns: { groupId: true },
  });
  const memberGroupIds = memberships.map((row) => row.groupId);

  const candidates = await database.query.groups.findMany({
    where:
      memberGroupIds.length > 0
        ? and(
            eq(groups.type, GroupTypeEnum.PUBLIC),
            eq(groups.sport, GroupSportEnum.PADEL),
            notInArray(groups.id, memberGroupIds),
          )
        : and(
            eq(groups.type, GroupTypeEnum.PUBLIC),
            eq(groups.sport, GroupSportEnum.PADEL),
          ),
    with: {
      community: {
        columns: { name: true, archivedAt: true },
      },
    },
  });

  const live = candidates.filter((group) => {
    if (!group.communityId) {
      return true;
    }
    if (!group.community) {
      return false;
    }
    return !consult({ archivedAt: group.community.archivedAt }).freeze("join");
  });

  if (live.length === 0) {
    return [];
  }

  const memberRows = await database.query.groupMembers.findMany({
    where: inArray(
      groupMembers.groupId,
      live.map((group) => group.id),
    ),
    columns: { groupId: true },
  });
  const memberCountByGroup = new Map<string, number>();
  for (const row of memberRows) {
    memberCountByGroup.set(
      row.groupId,
      (memberCountByGroup.get(row.groupId) ?? 0) + 1,
    );
  }

  live.sort((a, b) => {
    const countDelta =
      (memberCountByGroup.get(b.id) ?? 0) - (memberCountByGroup.get(a.id) ?? 0);
    if (countDelta !== 0) {
      return countDelta;
    }
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const limited = live.slice(0, PUBLIC_LIST_LIMIT);
  const rows: PublicGroupRow[] = [];
  for (const group of limited) {
    const joinMode = await groupJoinMode(database, group, args.userId);
    if (!isPublicListJoinMode(joinMode)) {
      continue;
    }
    rows.push({
      id: group.id,
      name: group.name,
      sport: group.sport,
      communityName: group.community?.name ?? null,
      memberCount: memberCountByGroup.get(group.id) ?? 0,
      requiresApproval: group.requiresApproval,
      joinMode,
      imageUrl: group.imageUrl ?? null,
    });
  }

  return rows;
}

export const listPublicProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listPublic(ctx.db, { userId: appUser.id });
});
