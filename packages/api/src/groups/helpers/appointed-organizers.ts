import type { DbClient, DbTx } from "@repo/db";
import { and, eq } from "drizzle-orm";

import { groupMembers, GroupMemberRoleEnum, type groups } from "@repo/db";

type DbOrTx = DbClient | DbTx;

type GroupForAppointed = Pick<typeof groups.$inferSelect, "id">;

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
  return rows.map((row) => row.userId);
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
  return Boolean(membership);
}

/** Groups whose Games `userId` organizes by appointment. */
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
  });
  return rows.map((row) => row.groupId);
}
