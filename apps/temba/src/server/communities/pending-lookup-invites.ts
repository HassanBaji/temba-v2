import { and, eq, isNull } from "drizzle-orm";

import { communityMemberInvites } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function pendingLookupInvites(
  database: DbClient,
  args: { userId: string },
) {
  const rows = await database.query.communityMemberInvites.findMany({
    where: and(
      eq(communityMemberInvites.userId, args.userId),
      isNull(communityMemberInvites.acceptedAt),
      isNull(communityMemberInvites.revokedAt),
    ),
    with: {
      community: {
        columns: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    communityId: row.communityId,
    communityName: row.community.name,
    invitedBy: {
      id: row.invitedBy.id,
      name: row.invitedBy.name,
      email: row.invitedBy.email,
    },
    createdAt: row.createdAt,
  }));
}
