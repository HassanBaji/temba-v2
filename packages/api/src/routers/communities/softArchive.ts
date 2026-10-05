import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { commit, throwCommitFailure } from "#src/soft-archive";

type DbClient = typeof db;

export async function softArchive(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  await requireStaff(database, community.id, args.userId);

  // Soft-archive hides listing and join paths. Club Groups stay attached
  // (communityId unchanged). Invite tokens are kept, not auto-revoked.
  const updated = await commit(
    database,
    { communityId: community.id },
    "archived",
  );
  if (!updated.ok) {
    throwCommitFailure(updated);
  }

  return {
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}

export const softArchiveProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return softArchive(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
