import { eq } from "drizzle-orm";
import { z } from "zod";

import { liveBoards } from "@repo/db";
import { type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireManagedBoard } from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/**
 * Closes the board on every TV and retires its Board code. The Game is not
 * touched, and Show on TV starts a new board with a new code.
 */
export async function stopLiveBoard(
  database: typeof db,
  args: { gameId: string; userId: string; locale?: Locale; now?: Date },
) {
  const now = args.now ?? new Date();
  const { board } = await requireManagedBoard(database, {
    gameId: args.gameId,
    userId: args.userId,
    locale: args.locale,
    now,
  });
  await database
    .update(liveBoards)
    .set({ stoppedAt: now, updatedAt: now })
    .where(eq(liveBoards.id, board.id));
  return { ok: true as const };
}

export const stopProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return stopLiveBoard(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
