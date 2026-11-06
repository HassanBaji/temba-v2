import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { games, groups, MatchStatusEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { cancelGameRecord } from "#src/games/helpers/cancel-game-record";
import { assertGroupOwner } from "#src/groups/helpers/group-owner";
import { requireGroup } from "#src/groups/helpers/require-group";
import { gameListTime } from "#src/home/upcoming-games";

type DbClient = typeof db;

/**
 * Soft-delete a Group: the owner hides it for everyone. Memberships, the standing and the Games are kept, so a played
 * Game stays in each player's history. Games that have not started yet are
 * cancelled; nobody is notified.
 */
export async function deleteGroup(
  database: DbClient,
  args: { groupId: string; userId: string; now?: Date },
) {
  const group = await requireGroup(database, args.groupId);
  assertGroupOwner(group, args.userId, "Only the Group owner can delete this Group");

  const now = args.now ?? new Date();
  const liveGames = await database.query.games.findMany({
    where: and(eq(games.groupId, group.id), isNull(games.cancelledAt)),
    with: {
      matches: { columns: { status: true, startTime: true } },
    },
  });
  const upcoming = liveGames.filter(
    (game) =>
      gameListTime(game).getTime() > now.getTime() &&
      !game.matches.some((match) => match.status === MatchStatusEnum.COMPLETED),
  );

  await database.transaction(async (tx) => {
    for (const game of upcoming) {
      await cancelGameRecord(tx, game);
    }
    await tx
      .update(groups)
      .set({ deletedAt: now, deletedBy: args.userId, updatedAt: now })
      .where(eq(groups.id, group.id));
  });

  return {
    ok: true as const,
    groupId: group.id,
    cancelledGameCount: upcoming.length,
  };
}

export const deleteProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deleteGroup(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
