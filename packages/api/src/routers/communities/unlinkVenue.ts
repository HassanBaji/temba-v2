import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { communities } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

export async function unlinkVenue(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);
  await requireStaff(
    database,
    community.id,
    args.userId,
    "Only Owner or Admin can unlink a Venue",
  );

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot unlink a Venue from an archived Community",
  });

  if (!community.venueId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Community is not linked to a Venue",
    });
  }

  await database
    .update(communities)
    .set({
      venueId: null,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, community.id));

  return {
    ok: true as const,
    communityId: community.id,
  };
}

export const unlinkVenueProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return unlinkVenue(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
