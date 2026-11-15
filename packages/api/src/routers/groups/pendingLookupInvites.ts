import type { DbClient } from "@repo/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { groupMemberInvites, groups } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";

export async function pendingLookupInvites(
  database: DbClient,
  args: { userId: string },
) {
  const rows = await database.query.groupMemberInvites.findMany({
    where: and(
      eq(groupMemberInvites.userId, args.userId),
      isNull(groupMemberInvites.acceptedAt),
      isNull(groupMemberInvites.revokedAt),
      inArray(
        groupMemberInvites.groupId,
        database
          .select({ id: groups.id })
          .from(groups)
          .where(isNull(groups.deletedAt)),
      ),
    ),
    with: {
      group: true,
      invitedBy: {
        columns: {
          id: true,
          name: true,
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
    imageUrl: row.group.imageUrl ?? null,
    invitedBy: {
      id: row.invitedBy.id,
      name: row.invitedBy.name,
      image: row.invitedBy.image,
    },
    createdAt: row.createdAt,
  }));
}

export const pendingLookupInvitesProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingLookupInvites(ctx.db, { userId: appUser.id });
  },
);
