import {
  leave as leaveCommunity,
  throwLeaveFailure,
} from "~/server/community-membership";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function leave(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  // Leave removes membership only — never Soft-archives the Community.
  await database.transaction(async (tx) => {
    throwLeaveFailure(
      await leaveCommunity(tx, {
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
