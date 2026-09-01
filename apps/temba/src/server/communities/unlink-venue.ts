import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communities } from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

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
