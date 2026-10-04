import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  leave as leaveMembership,
  throwLeaveFailure,
} from "#src/community-membership";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function leaveCommunity(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  // Leave removes membership only — never Soft-archives the Community.
  await database.transaction(async (tx) => {
    throwLeaveFailure(
      await leaveMembership(tx, {
        communityId: community.id,
        userId: args.userId,
      }),
    );
  });

  return {
    ok: true as const,
    communityId: community.id,
  };
}

export const leave = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveCommunity(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
