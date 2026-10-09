import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroupLookupSender } from "#src/groups/helpers/require-group-lookup-sender";
import { listLookup } from "#src/invites/doors";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const { group } = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
  );

  return listLookup(database, { kind: "group", id: group.id });
}

export const listLookupInvitesProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listLookupInvites(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
