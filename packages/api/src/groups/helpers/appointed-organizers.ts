import type { DbClient, DbTx } from "@repo/db";
import { and, eq, inArray } from "drizzle-orm";

import {
  communityMembers,
  groupMembers,
  GroupMemberRoleEnum,
  type groups,
} from "@repo/db";

type DbOrTx = DbClient | DbTx;

type GroupForAppointed = Pick<typeof groups.$inferSelect, "id" | "communityId">;

/**
 * On a Club Group the appointment lapses while the player is not a Community
 * Member, the same way the Group creator stops being a Group approver.
 */
async function communityMemberIds(
  database: DbOrTx,
  communityId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Set<string>();
  }
  const rows = await database.query.communityMembers.findMany({
    where: and(
      eq(communityMembers.communityId, communityId),
      inArray(communityMembers.userId, userIds),
    ),
    columns: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}

export async function appointedOrganizerUserIds(
  database: DbOrTx,
  group: GroupForAppointed,
): Promise<string[]> {
  const rows = await database.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.role, GroupMemberRoleEnum.ORGANIZER),
    ),
    columns: { userId: true },
  });
  const userIds = rows.map((row) => row.userId);
  if (!group.communityId) {
    return userIds;
  }
  const members = await communityMemberIds(
    database,
    group.communityId,
    userIds,
  );
  return userIds.filter((userId) => members.has(userId));
}

export async function isAppointedOrganizer(
  database: DbOrTx,
  group: GroupForAppointed,
  userId: string,
) {
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, userId),
      eq(groupMembers.role, GroupMemberRoleEnum.ORGANIZER),
    ),
    columns: { id: true },
  });
  if (!membership) {
    return false;
  }
  if (!group.communityId) {
    return true;
  }
  const members = await communityMemberIds(database, group.communityId, [
    userId,
  ]);
  return members.has(userId);
}

/** Groups whose Games `userId` organizes by appointment, lapses applied. */
export async function appointedOrganizerGroupIds(
  database: DbOrTx,
  userId: string,
): Promise<string[]> {
  const rows = await database.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.role, GroupMemberRoleEnum.ORGANIZER),
    ),
    columns: { groupId: true },
    with: { group: { columns: { communityId: true } } },
  });
  const clubCommunityIds = rows
    .map((row) => row.group.communityId)
    .filter((communityId): communityId is string => communityId != null);
  const memberCommunityIds =
    clubCommunityIds.length === 0
      ? new Set<string>()
      : new Set(
          (
            await database.query.communityMembers.findMany({
              where: and(
                eq(communityMembers.userId, userId),
                inArray(communityMembers.communityId, clubCommunityIds),
              ),
              columns: { communityId: true },
            })
          ).map((row) => row.communityId),
        );
  return rows
    .filter(
      (row) =>
        row.group.communityId == null ||
        memberCommunityIds.has(row.group.communityId),
    )
    .map((row) => row.groupId);
}
