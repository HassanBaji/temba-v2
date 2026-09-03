import { and, eq, isNull } from "drizzle-orm";

import { communityMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
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
          image: true,
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
