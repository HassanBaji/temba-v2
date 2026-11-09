import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groupSeasons } from "@repo/db";

import { sortSeasonsNewestFirst } from "@repo/domain/group-season";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertCanViewGroup } from "#src/groups/helpers/assert-can-view-group";
import { canManageSeasons } from "#src/groups/helpers/season-access";
import { requireGroup } from "#src/groups/helpers/require-group";
import { toSeasonRow } from "#src/standing/load-group-standing";

type DbClient = typeof db;

/**
 * The Seasons settings list (design "Seasons" 1j): every Season of the
 * Group, newest first, with its status. Anyone who may see the Group may
 * read it; only an owner may change it, which `canManage` says.
 */
export async function listSeasons(
  database: DbClient,
  args: {
    groupId: string;
    userId: string;
    now?: Date;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
  },
) {
  const group = await requireGroup(database, args.groupId);
  await assertCanViewGroup(
    database,
    group,
    args.userId,
    args.getPublicMetadata,
  );
  const now = args.now ?? new Date();

  const [membership, rows] = await Promise.all([
    database.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, args.userId),
      ),
      columns: { id: true },
    }),
    database.query.groupSeasons.findMany({
      where: eq(groupSeasons.groupId, group.id),
    }),
  ]);

  return {
    groupId: group.id,
    groupName: group.name,
    isMember: membership != null,
    canManage: canManageSeasons(group, args.userId),
    seasons: sortSeasonsNewestFirst(rows.map((row) => toSeasonRow(row, now))),
  };
}

export const listSeasonsProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listSeasons(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
    });
  });
