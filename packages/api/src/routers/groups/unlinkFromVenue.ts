import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import { protectedProcedure } from "#src/trpc";
import { unlinkGroupFromVenueCommunity } from "#src/venue-community/unlink-group";

type DbClient = typeof db;

export async function unlinkFromVenue(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);
  if (group.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the Group creator can leave the Venue's Community",
    });
  }
  return unlinkGroupFromVenueCommunity(database, { groupId: group.id });
}

export const unlinkFromVenueProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return unlinkFromVenue(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
