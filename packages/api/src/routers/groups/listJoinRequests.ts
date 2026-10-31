import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  ratings,
} from "@repo/db";

import { youRatingViewAfterIdle } from "@repo/domain/idle";
import type { LevelBand } from "@repo/domain/level-bands";

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
  args: { groupId: string; userId: string; now?: Date },
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
      invitedBy: {
        columns: { id: true, name: true },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const now = args.now ?? new Date();
  const requesterIds = rows.map((row) => row.userId);
  const levelByUserId = new Map<
    string,
    { levelBand: LevelBand; provisional: boolean; level: string }
  >();
  if (group.sport && requesterIds.length > 0) {
    const ratingRows = await database.query.ratings.findMany({
      where: and(
        eq(ratings.sport, group.sport),
        inArray(ratings.userId, requesterIds),
      ),
    });
    for (const row of ratingRows) {
      const view = youRatingViewAfterIdle(row, now);
      levelByUserId.set(row.userId, {
        levelBand: view.levelBand,
        provisional: view.provisional,
        level: view.level,
      });
    }
  }

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
        note: row.note,
        source: row.source,
        invitedBy: row.invitedBy
          ? { id: row.invitedBy.id, name: row.invitedBy.name }
          : null,
        level: levelByUserId.get(row.userId) ?? null,
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
