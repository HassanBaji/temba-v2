import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requirePendingLevelRangeRequest } from "~/server/games/level-range-requests";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function rejectLevelRangeRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await requirePendingLevelRangeRequest(
    database,
    args.requestId,
    args.userId,
    "reject",
  );
  const [updated] = await database
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
  return { ok: true as const };
}

export const rejectLevelRangeRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return rejectLevelRangeRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
