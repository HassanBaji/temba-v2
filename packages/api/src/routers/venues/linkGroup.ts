import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
  venues,
  type DbClient,
} from "@repo/db";

import { consult, refuseIfFrozen } from "#src/soft-archive";
import { operatorProcedure } from "#src/trpc";

/**
 * An Operator links a Loose Group to a Venue at once, with no Group link
 * request for the Group creator to decide. The Group's pending requests
 * lapse, as they do when one is accepted.
 */
export async function linkGroup(
  database: DbClient,
  args: { venueId: string; groupId: string },
) {
  return database.transaction(async (tx) => {
    const [venue] = await tx
      .select({ id: venues.id, archivedAt: venues.archivedAt })
      .from(venues)
      .where(eq(venues.id, args.venueId))
      .for("update");
    if (!venue) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    }
    refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
      frozenMessage: "Cannot link a Group to a Soft-archived Venue",
      notFoundMessage: "Venue not found",
    });

    const [group] = await tx
      .select({
        id: groups.id,
        venueId: groups.venueId,
        deletedAt: groups.deletedAt,
      })
      .from(groups)
      .where(eq(groups.id, args.groupId))
      .for("update");
    if (!group || group.deletedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }
    if (group.venueId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only a Loose Group can be linked to a Venue",
      });
    }

    const now = new Date();
    await tx
      .update(groups)
      .set({ venueId: venue.id, updatedAt: now })
      .where(eq(groups.id, group.id));
    await tx
      .update(groupLinkRequests)
      .set({ status: GroupLinkRequestStatusEnum.CANCELLED, updatedAt: now })
      .where(
        and(
          eq(groupLinkRequests.groupId, group.id),
          eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
        ),
      );

    return { ok: true as const, groupId: group.id, venueId: venue.id };
  });
}

export const linkGroupProcedure = operatorProcedure
  .input(z.object({ venueId: z.string().uuid(), groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return linkGroup(ctx.db, input);
  });
