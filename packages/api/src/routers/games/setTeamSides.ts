import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { setTeamSides as writeTeamSides } from "#src/games/seats";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** An Organizer writes a full Game team's sides on the sheet, or swaps them. */
export async function setTeamSides(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    sideIndex: number;
    leftUserId: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  if (game.format !== "friendly_game" || game.sport === "football") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sides are set on a padel Friendly game",
    });
  }
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is cancelled",
    });
  }
  await assertGameOrganizer(database, game, args.organizerUserId);
  await database.transaction(async (tx) => {
    const { userIds } = await writeTeamSides(tx, game, {
      sideIndex: args.sideIndex,
      leftUserId: args.leftUserId,
      organizerUserId: args.organizerUserId,
    });
    await notify(tx, {
      type: "game_side_changed",
      recipients: userIds.map((userId) => ({ userId, audience: "player" })),
      excludeUserIds: [args.organizerUserId],
      actorUserId: args.organizerUserId,
      groupId: game.groupId,
      gameId: game.id,
    });
  });
  return { ok: true as const };
}

export const setTeamSidesProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      sideIndex: z.number().int().min(1),
      leftUserId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setTeamSides(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      sideIndex: input.sideIndex,
      leftUserId: input.leftUserId,
    });
  });
