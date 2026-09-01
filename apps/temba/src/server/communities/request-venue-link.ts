import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
  venues,
} from "@repo/db";

import { asVenueLinkStatus } from "~/server/communities/helpers/as-venue-link-status";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function requestVenueLink(
  database: DbClient,
  args: { communityId: string; userId: string; venueId: string },
) {
  const community = await requireCommunity(database, args.communityId);
  await requireStaff(
    database,
    community.id,
    args.userId,
    "Only Owner or Admin can request a Venue link",
  );

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot request a Venue link for an archived Community",
  });

  if (community.venueId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Community already has a Venue link",
    });
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: { id: true, archivedAt: true },
  });

  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "catalog", {
    frozenMessage: "Cannot request a link to a Soft-archived Venue",
    notFoundMessage: "Venue not found",
  });

  const pending = await database.query.venueLinkRequests.findFirst({
    where: and(
      eq(venueLinkRequests.communityId, community.id),
      eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
    ),
  });

  if (pending) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This Community already has a pending Venue link request",
    });
  }

  try {
    const [created] = await database
      .insert(venueLinkRequests)
      .values({
        communityId: community.id,
        venueId: venue.id,
        requestedBy: args.userId,
        status: VenueLinkRequestStatusEnum.PENDING,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Venue link request",
      });
    }

    return {
      id: created.id,
      communityId: created.communityId,
      venueId: created.venueId,
      status: asVenueLinkStatus(created.status),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Community already has a pending Venue link request",
      });
    }
    throw error;
  }
}
