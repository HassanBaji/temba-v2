import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { games, groups, MatchStatusEnum, teams } from "@repo/db";

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
 * cancelled; nobody is notified. Teams tagged to the Group lose the tag and
 * keep their record.
 */
export async function deleteGroup(
  database: DbClient,
  args: { groupId: string; userId: string; now?: Date },
) {
  const group = await requireGroup(database, args.groupId);
  assertGroupOwner(group, args.userId, "Only the Group owner can delete this Group");

  const now = args.now ?? new Date();

  const cancelled = await database.transaction(async (tx) => {
    const locked = await tx
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.groupId, group.id), isNull(games.cancelledAt)))
      .for("update");
    const liveGames =
      locked.length === 0
        ? []
        : await tx.query.games.findMany({
            where: and(
              inArray(
                games.id,
                locked.map((row) => row.id),
              ),
              isNull(games.cancelledAt),
            ),
            with: {
              matches: { columns: { status: true, startTime: true } },
            },
          });
    const upcoming = liveGames.filter(
      (game) =>
        gameListTime(game).getTime() > now.getTime() &&
        !game.matches.some(
          (match) => match.status === MatchStatusEnum.COMPLETED,
        ),
    );
    for (const game of upcoming) {
      await cancelGameRecord(tx, game);
    }
    await tx
      .update(groups)
      .set({ deletedAt: now, deletedBy: args.userId, updatedAt: now })
      .where(eq(groups.id, group.id));
    await tx
      .update(teams)
      .set({ groupId: null, updatedAt: now })
      .where(eq(teams.groupId, group.id));
    return upcoming.length;
  });

  return {
    ok: true as const,
    groupId: group.id,
    cancelledGameCount: cancelled,
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
