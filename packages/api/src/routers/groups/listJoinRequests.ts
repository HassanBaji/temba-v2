import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

export async function listJoinRequests(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "join", {
      frozenMessage:
        "Cannot list join requests while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  const rows = await database.query.groupJoinRequests.findMany({
    where: and(
      eq(groupJoinRequests.groupId, group.id),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
    ),
    with: {
      user: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return Promise.all(
    rows.map(async (row) => {
      const communityMembership = group.communityId
        ? await requireCommunityMembership(
            database,
            group.communityId,
            row.userId,
          )
        : null;
      return {
        id: row.id,
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          image: row.user.image,
        },
        isCommunityMember: group.communityId
          ? Boolean(communityMembership)
          : null,
      };
    }),
  );
}

export const listJoinRequestsProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listJoinRequests(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
