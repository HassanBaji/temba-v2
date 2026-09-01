import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { venueLinkRequests, VenueLinkRequestStatusEnum } from "@repo/db";

import { requirePendingVenueLinkRequest } from "~/server/venues/helpers/require-pending-venue-link-request";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function rejectLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await requirePendingVenueLinkRequest(
    database,
    args.requestId,
  );

  const [updated] = await database
    .update(venueLinkRequests)
    .set({
      status: VenueLinkRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(venueLinkRequests.id, request.id),
        eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
      ),
    )
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Venue link request is no longer pending",
    });
  }

  return {
    ok: true as const,
    communityId: request.communityId,
    venueId: request.venueId,
  };
}
