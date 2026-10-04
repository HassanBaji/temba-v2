import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireLiveCommunity } from "#src/communities/helpers/require-live-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { listLookup } from "#src/invites/doors";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  return listLookup(database, {
    kind: "community",
    id: community.id,
  });
}

export const listLookupInvitesProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listLookupInvites(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
