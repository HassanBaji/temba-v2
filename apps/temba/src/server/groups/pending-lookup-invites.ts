import { and, eq, isNull } from "drizzle-orm";

import { groupMemberInvites } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function pendingLookupInvites(
  database: DbClient,
  args: { userId: string },
) {
  const rows = await database.query.groupMemberInvites.findMany({
    where: and(
      eq(groupMemberInvites.userId, args.userId),
      isNull(groupMemberInvites.acceptedAt),
      isNull(groupMemberInvites.revokedAt),
    ),
    with: {
      group: true,
      invitedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    groupId: row.groupId,
    groupName: row.group.name,
    invitedBy: {
      id: row.invitedBy.id,
      name: row.invitedBy.name,
      email: row.invitedBy.email,
      image: row.invitedBy.image,
    },
    createdAt: row.createdAt,
  }));
}
