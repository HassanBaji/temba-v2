import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { liveBoardTvs } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireManagedBoard } from "#src/live-boards/boards";
import { protectedProcedure } from "#src/trpc";

/** Takes one TV off the board. The code still works, so it can be added again. */
export async function disconnectLiveBoardTv(
  database: typeof db,
  args: {
    gameId: string;
    tvId: string;
    userId: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const { board } = await requireManagedBoard(database, {
    gameId: args.gameId,
    userId: args.userId,
    locale,
    now,
  });
  const [tv] = await database
    .update(liveBoardTvs)
    .set({ disconnectedAt: now })
    .where(
      and(
        eq(liveBoardTvs.id, args.tvId),
        eq(liveBoardTvs.boardId, board.id),
        isNull(liveBoardTvs.disconnectedAt),
      ),
    )
    .returning({ id: liveBoardTvs.id });
  if (!tv) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).liveBoard.errors.tvNotFound,
    });
  }
  return { ok: true as const };
}

export const disconnectTvProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid(), tvId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return disconnectLiveBoardTv(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
