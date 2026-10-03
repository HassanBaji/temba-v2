import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venueLinkRequests, VenueLinkRequestStatusEnum } from "@repo/db";

import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requirePendingVenueLinkRequest(
  database: DbClient,
  requestId: string,
) {
  const request = await database.query.venueLinkRequests.findFirst({
    where: eq(venueLinkRequests.id, requestId),
    with: {
      community: true,
      venue: true,
    },
  });

  if (request?.status !== VenueLinkRequestStatusEnum.PENDING) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Venue link request is not available",
    });
  }

  refuseIfFrozen(
    consult({ archivedAt: request.community.archivedAt }),
    "host",
    {
      frozenMessage:
        "Cannot decide Venue link requests for an archived Community",
    },
  );

  refuseIfFrozen(consult({ archivedAt: request.venue.archivedAt }), "host", {
    frozenMessage:
      "Cannot decide Venue link requests for a Soft-archived Venue",
    notFoundMessage: "Venue not found",
  });

  return request;
}
