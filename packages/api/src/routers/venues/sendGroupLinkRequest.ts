import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function sendGroupLinkRequest(
  database: DbClient,
  args: {
    venueId: string;
    groupId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  const venue = await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: venue.id,
    ...args.actor,
  });
  refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
    frozenMessage: "Cannot link a Group to a Soft-archived Venue",
    notFoundMessage: "Venue not found",
  });

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, args.groupId),
    columns: { id: true, communityId: true },
  });
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }
  if (group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a Loose Group can be linked to a Venue Community",
    });
  }

  const pending = await database.query.groupLinkRequests.findFirst({
    where: and(
      eq(groupLinkRequests.groupId, group.id),
      eq(groupLinkRequests.venueId, venue.id),
      eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
    ),
    columns: { id: true },
  });
  if (pending) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This Group already has a pending link request from this Venue",
    });
  }

  try {
    const [created] = await database
      .insert(groupLinkRequests)
      .values({
        groupId: group.id,
        venueId: venue.id,
        requestedBy: args.actor.userId,
      })
      .returning({
        id: groupLinkRequests.id,
        groupId: groupLinkRequests.groupId,
        venueId: groupLinkRequests.venueId,
        status: groupLinkRequests.status,
      });
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Group link request",
      });
    }
    return created;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This Group already has a pending link request from this Venue",
      });
    }
    throw error;
  }
}

export const sendGroupLinkRequestProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      groupId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return sendGroupLinkRequest(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
