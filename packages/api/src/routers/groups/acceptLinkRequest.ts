import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne, notInArray } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  CommunityTypeEnum,
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groupMemberInvites,
  groupMembers,
  groups,
  venues,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "#src/community-membership";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function acceptLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
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

    const group = await tx.query.groups.findFirst({
      where: eq(groups.id, request.groupId),
    });
    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }
    if (group.createdBy !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the Group creator can decide this request",
      });
    }
    if (group.communityId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only a Loose Group can join a Venue Community",
      });
    }
    refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
      frozenMessage: "Cannot link a Group to a Soft-archived Venue",
      notFoundMessage: "Venue not found",
    });

    let community = await tx.query.communities.findFirst({
      where: and(
        eq(communities.venueId, venue.id),
        eq(communities.isVenueCommunity, true),
      ),
    });
    if (!community) {
      const [created] = await tx
        .insert(communities)
        .values({
          name: venue.name,
          type: CommunityTypeEnum.PRIVATE,
          createdBy: request.requestedBy,
          venueId: venue.id,
          isVenueCommunity: true,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create the Venue Community",
        });
      }
      community = created;
      throwAdmitFailure(
        await admitCommunityMember(tx, {
          communityId: community.id,
          userId: request.requestedBy,
          role: CommunityRoleEnum.OWNER,
        }),
      );
    } else {
      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
        frozenMessage: "The Venue's Community is Soft-archived",
      });
    }

    if (group.sport) {
      await tx
        .insert(communitySports)
        .values({ communityId: community.id, sport: group.sport })
        .onConflictDoNothing();
    }

    const members = await tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    for (const member of members) {
      const admitted = await admitCommunityMember(tx, {
        communityId: community.id,
        userId: member.userId,
        role: CommunityRoleEnum.MEMBER,
      });
      if (!admitted.ok && admitted.reason !== "already_member") {
        throwAdmitFailure(admitted);
      }
    }

    const now = new Date();
    await tx
      .update(groups)
      .set({ communityId: community.id, updatedAt: now })
      .where(eq(groups.id, group.id));

    const communityMemberIds = tx
      .select({ userId: communityMembers.userId })
      .from(communityMembers)
      .where(eq(communityMembers.communityId, community.id));
    await tx
      .update(groupMemberInvites)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(groupMemberInvites.groupId, group.id),
          isNull(groupMemberInvites.acceptedAt),
          isNull(groupMemberInvites.revokedAt),
          notInArray(groupMemberInvites.userId, communityMemberIds),
        ),
      );

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
      communityId: community.id,
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
    });
  });
