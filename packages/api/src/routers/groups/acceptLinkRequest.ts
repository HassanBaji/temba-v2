import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
  GroupTypeEnum,
  venues,
} from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * The Group creator accepts a Venue's Group link request: the Loose Group
 * becomes a Club Group of that Venue, and its other pending requests lapse.
 * The Venue, then the Group, is locked, so two Venues' requests for the same
 * Group cannot both be accepted.
 */
export async function acceptLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale },
) {
  return database.transaction(async (tx) => {
    const unlocked = await tx.query.groupLinkRequests.findFirst({
      where: eq(groupLinkRequests.id, args.requestId),
      columns: { venueId: true },
    });
    if (!unlocked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Group link request not found",
      });
    }

    const [venue] = await tx
      .select({
        id: venues.id,
        name: venues.name,
        archivedAt: venues.archivedAt,
      })
      .from(venues)
      .where(eq(venues.id, unlocked.venueId))
      .for("update");
    if (!venue) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    }

    const request = await tx.query.groupLinkRequests.findFirst({
      where: eq(groupLinkRequests.id, args.requestId),
    });
    if (request?.status !== "pending") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Group link request is no longer pending",
      });
    }

    const [group] = await tx
      .select()
      .from(groups)
      .where(and(eq(groups.id, request.groupId), isNull(groups.deletedAt)))
      .for("update");
    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }
    if (group.createdBy !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the Group creator can decide this request",
      });
    }
    if (group.venueId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only a Loose Group can be linked to a Venue",
      });
    }
    if (group.type !== GroupTypeEnum.PUBLIC) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(args.locale ?? DEFAULT_LOCALE).group.linkRequest
          .publicOnly,
      });
    }
    refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
      frozenMessage: "Cannot link a Group to a Soft-archived Venue",
      notFoundMessage: "Venue not found",
    });

    const now = new Date();
    await tx
      .update(groups)
      .set({ venueId: venue.id, updatedAt: now })
      .where(eq(groups.id, group.id));

    await tx
      .update(groupLinkRequests)
      .set({
        status: GroupLinkRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: now,
      })
      .where(eq(groupLinkRequests.id, request.id));
    await tx
      .update(groupLinkRequests)
      .set({
        status: GroupLinkRequestStatusEnum.CANCELLED,
        updatedAt: now,
      })
      .where(
        and(
          eq(groupLinkRequests.groupId, group.id),
          eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
          ne(groupLinkRequests.id, request.id),
        ),
      );

    return {
      ok: true as const,
      groupId: group.id,
      venueId: venue.id,
    };
  });
}

export const acceptLinkRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptLinkRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
