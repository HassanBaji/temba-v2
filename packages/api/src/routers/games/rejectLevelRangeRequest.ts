import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
} from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { requirePendingLevelRangeRequest } from "#src/games/level-range-requests";
import { notifyLevelRangeDecided } from "#src/notifications/notify-requests";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function rejectLevelRangeRequest(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const request = await requirePendingLevelRangeRequest(
    database,
    args.requestId,
    args.userId,
    "reject",
    locale,
  );
  const game = await requireGame(database, request.gameId, locale);
  await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(gameLevelRangeRequests)
      .set({
        status: GameLevelRangeRequestStatusEnum.REJECTED,
        decidedBy: args.userId,
        updatedAt: new Date(),
      })
      .where(eq(gameLevelRangeRequests.id, request.id))
      .returning();
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reject Level range request",
      });
    }
    await notifyLevelRangeDecided(tx, {
      game,
      requesterUserId: request.userId,
      deciderUserId: args.userId,
      approved: false,
    });
  });
  return { ok: true as const };
}

export const rejectLevelRangeRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return rejectLevelRangeRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
