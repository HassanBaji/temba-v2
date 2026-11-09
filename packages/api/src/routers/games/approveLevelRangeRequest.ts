import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { requirePendingLevelRangeRequest } from "#src/games/level-range-requests";
import { seatRequesterOnGame } from "#src/games/seat-holds";
import { notifyLevelRangeDecided } from "#src/notifications/notify-requests";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function approveLevelRangeRequest(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const request = await requirePendingLevelRangeRequest(
    database,
    args.requestId,
    args.userId,
    "approve",
  );
  const game = await requireGame(database, request.gameId);
  const seated = await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(gameLevelRangeRequests)
      .set({
        status: GameLevelRangeRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: now,
      })
      .where(eq(gameLevelRangeRequests.id, request.id))
      .returning();
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve Level range request",
      });
    }
    // The waiver is written above, so admit sees the requester as in range.
    const outcome = request.heldSeat
      ? await seatRequesterOnGame(tx, {
          gameId: game.id,
          userId: request.userId,
          heldSeat: request.heldSeat,
          approverUserId: args.userId,
          locale,
          now,
        })
      : null;
    await notifyLevelRangeDecided(tx, {
      game,
      requesterUserId: request.userId,
      deciderUserId: args.userId,
      approved: true,
    });
    return outcome;
  });
  return { ok: true as const, seated };
}

export const approveLevelRangeRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return approveLevelRangeRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
