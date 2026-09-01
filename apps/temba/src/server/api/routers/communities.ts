import { TRPCError } from "@trpc/server";
import { and, eq, gt, ilike, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityInviteLinks,
  communityJoinRequests,
  communityMemberInvites,
  communityMembers,
  communitySports,
  CommunityJoinRequestStatusEnum,
  CommunityRoleEnum,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  teams,
  user,
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
  venues,
  type GroupSportEnum,
} from "@repo/db";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "~/server/community-membership";
import { addSport } from "~/server/communities/add-sport";
import { communityById } from "~/server/communities/by-id";
import { createCommunity } from "~/server/communities/create";
import { asJoinStatus } from "~/server/communities/helpers/as-join-status";
import { asVenueLinkStatus } from "~/server/communities/helpers/as-venue-link-status";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { leave as leaveCommunity } from "~/server/communities/leave";
import { listMembers } from "~/server/communities/list-members";
import { mine } from "~/server/communities/mine";
import { removeSport } from "~/server/communities/remove-sport";
import { setMemberRole } from "~/server/communities/set-member-role";
import { softArchive } from "~/server/communities/soft-archive";
import { unarchive } from "~/server/communities/unarchive";
import {
  acceptLink,
  acceptLookup,
  listLookup,
  mintLink,
  mintLookup,
  previewLink,
  revokeLookup,
  throwInviteFrozen,
} from "~/server/invites/doors";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";
import { searchLookupUsers } from "~/server/invites/search-lookup-users";
import { communityInviteLinkUrl, getAppOrigin } from "~/server/invites/tokens";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

export const communitiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        type: communityTypeSchema,
        sports: z.array(sportSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createCommunity(ctx.db, {
        name: input.name,
        description: input.description,
        type: input.type,
        sports: input.sports,
        userId: appUser.id,
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return communityById(ctx.db, {
        communityId: input.id,
        userId: appUser.id,
      });
    }),

  listMembers: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listMembers(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  setMemberRole: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return setMemberRole(ctx.db, {
        communityId: input.communityId,
        callerId: appUser.id,
        userId: input.userId,
        role: input.role,
      });
    }),

  softArchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return softArchive(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return unarchive(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  leave: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return leaveCommunity(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  addSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return addSport(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        sport: input.sport,
      });
    }),

  removeSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return removeSport(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        sport: input.sport,
      });
    }),

  listTeamLinkRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
        "Only Owner or Admin can list Team link requests",
      );

      const rows = await ctx.db.query.teamLinkRequests.findMany({
        where: and(
          eq(teamLinkRequests.communityId, community.id),
          eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
        ),
        with: {
          team: true,
          requestedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      const teamIds = rows.map((row) => row.team.id);
      const memberRows =
        teamIds.length === 0
          ? []
          : await ctx.db.query.teamMembers.findMany({
              where: inArray(teamMembers.teamId, teamIds),
              with: {
                user: {
                  columns: { id: true, name: true },
                },
              },
            });
      const membersByTeam = new Map<string, string[]>();
      for (const row of memberRows) {
        const list = membersByTeam.get(row.teamId) ?? [];
        list.push(row.user.name);
        membersByTeam.set(row.teamId, list);
      }

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        team: {
          id: row.team.id,
          displayName: teamDisplayName(
            row.team.name,
            membersByTeam.get(row.team.id) ?? [],
          ),
          sport: row.team.sport as GroupSportEnum,
        },
        requestedBy: row.requestedBy,
      }));
    }),

  approveTeamLink: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const request = await ctx.db.query.teamLinkRequests.findFirst({
        where: eq(teamLinkRequests.id, input.requestId),
        with: {
          team: true,
        },
      });

      if (request?.status !== "pending") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team link request is not available",
        });
      }

      await requireStaff(
        ctx.db,
        request.communityId,
        appUser.id,
        "Only Owner or Admin can approve Team link requests",
      );

      const community = await requireCommunity(ctx.db, request.communityId);
      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
        frozenMessage:
          "Cannot approve Team link requests for an archived Community",
      });

      if (request.team.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is already linked to a Community",
        });
      }

      const allowedSport = await ctx.db.query.communitySports.findFirst({
        where: and(
          eq(communitySports.communityId, request.communityId),
          eq(communitySports.sport, request.team.sport),
        ),
      });

      if (!allowedSport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sport is not on this Community's sports allow-list",
        });
      }

      const memberRows = await ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, request.team.id),
      });

      if (memberRows.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incomplete Teams cannot be linked",
        });
      }

      await ctx.db.transaction(async (tx) => {
        for (const member of memberRows) {
          const admitted = await admitCommunityMember(tx, {
            communityId: request.communityId,
            userId: member.userId,
            role: CommunityRoleEnum.MEMBER,
          });
          if (!admitted.ok && admitted.reason !== "already_member") {
            throwAdmitFailure(admitted);
          }
        }

        await tx
          .update(teams)
          .set({
            communityId: request.communityId,
            updatedAt: new Date(),
          })
          .where(eq(teams.id, request.team.id));

        const [updated] = await tx
          .update(teamLinkRequests)
          .set({
            status: TeamLinkRequestStatusEnum.APPROVED,
            decidedBy: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamLinkRequests.id, request.id),
              eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Team link request is no longer pending",
          });
        }
      });

      return {
        ok: true as const,
        teamId: request.team.id,
        communityId: request.communityId,
      };
    }),

  rejectTeamLink: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const request = await ctx.db.query.teamLinkRequests.findFirst({
        where: eq(teamLinkRequests.id, input.requestId),
      });

      if (request?.status !== "pending") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team link request is not available",
        });
      }

      await requireStaff(
        ctx.db,
        request.communityId,
        appUser.id,
        "Only Owner or Admin can reject Team link requests",
      );

      const community = await requireCommunity(ctx.db, request.communityId);
      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
        frozenMessage:
          "Cannot reject Team link requests for an archived Community",
      });

      const [updated] = await ctx.db
        .update(teamLinkRequests)
        .set({
          status: TeamLinkRequestStatusEnum.REJECTED,
          decidedBy: appUser.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(teamLinkRequests.id, request.id),
            eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Team link request is no longer pending",
        });
      }

      return {
        ok: true as const,
        teamId: request.teamId,
        communityId: request.communityId,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mine(ctx.db, { userId: appUser.id });
  }),

  requestJoin: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community Private has no request-to-join path",
        });
      }

      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
        frozenMessage: "Cannot request to join an archived Community",
      });

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );
      if (membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this Community",
        });
      }

      const existing = await ctx.db.query.communityJoinRequests.findFirst({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(communityJoinRequests.userId, appUser.id),
        ),
      });

      if (existing?.status === "pending") {
        return {
          id: existing.id,
          status: asJoinStatus(existing.status),
        };
      }

      // Non-members may re-request after leave (approved leftover) or reject.
      if (existing?.status === "rejected" || existing?.status === "approved") {
        const [updated] = await ctx.db
          .update(communityJoinRequests)
          .set({
            status: CommunityJoinRequestStatusEnum.PENDING,
            decidedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(communityJoinRequests.id, existing.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to re-request join",
          });
        }

        return {
          id: updated.id,
          status: asJoinStatus(updated.status),
        };
      }

      const [created] = await ctx.db
        .insert(communityJoinRequests)
        .values({
          communityId: community.id,
          userId: appUser.id,
          status: CommunityJoinRequestStatusEnum.PENDING,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create join request",
        });
      }

      return {
        id: created.id,
        status: asJoinStatus(created.status),
      };
    }),

  listJoinRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      await requireStaff(ctx.db, community.id, appUser.id);

      const rows = await ctx.db.query.communityJoinRequests.findMany({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(
            communityJoinRequests.status,
            CommunityJoinRequestStatusEnum.PENDING,
          ),
        ),
        with: {
          user: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      return rows.map((row) => ({
        id: row.id,
        status: asJoinStatus(row.status),
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
    }),

  approveJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const request = await ctx.db.query.communityJoinRequests.findFirst({
        where: eq(communityJoinRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const community = await requireCommunity(ctx.db, request.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
        frozenMessage: "Cannot approve join requests for an archived Community",
      });

      await requireStaff(ctx.db, community.id, appUser.id);

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request is not pending",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(communityJoinRequests)
          .set({
            status: CommunityJoinRequestStatusEnum.APPROVED,
            decidedBy: appUser.id,
            updatedAt: new Date(),
          })
          .where(eq(communityJoinRequests.id, request.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve join request",
          });
        }

        const admitted = await admitCommunityMember(tx, {
          communityId: community.id,
          userId: request.userId,
          role: CommunityRoleEnum.MEMBER,
        });
        if (!admitted.ok && admitted.reason !== "already_member") {
          throwAdmitFailure(admitted);
        }
      });

      return { ok: true as const };
    }),

  rejectJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const request = await ctx.db.query.communityJoinRequests.findFirst({
        where: eq(communityJoinRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const community = await requireCommunity(ctx.db, request.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
        frozenMessage: "Cannot reject join requests for an archived Community",
      });

      await requireStaff(ctx.db, community.id, appUser.id);

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request is not pending",
        });
      }

      const [updated] = await ctx.db
        .update(communityJoinRequests)
        .set({
          status: CommunityJoinRequestStatusEnum.REJECTED,
          decidedBy: appUser.id,
          updatedAt: new Date(),
        })
        .where(eq(communityJoinRequests.id, request.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject join request",
        });
      }

      return { ok: true as const };
    }),

  searchLookupUsers: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const members = await ctx.db.query.communityMembers.findMany({
        where: eq(communityMembers.communityId, community.id),
        columns: { userId: true },
      });
      const unusedInvites = await ctx.db.query.communityMemberInvites.findMany({
        where: and(
          eq(communityMemberInvites.communityId, community.id),
          isNull(communityMemberInvites.acceptedAt),
          isNull(communityMemberInvites.revokedAt),
        ),
        columns: { userId: true },
      });

      return searchLookupUsers(ctx.db, {
        query: input.query,
        excludeUserIds: [
          appUser.id,
          ...members.map((member) => member.userId),
          ...unusedInvites.map((invite) => invite.userId),
        ],
      });
    }),

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const uniqueIds = [...new Set(input.userIds)];
      const targets = await ctx.db.query.user.findMany({
        where: inArray(user.id, uniqueIds),
        columns: {
          id: true,
          name: true,
        },
      });
      const targetsById = new Map(targets.map((row) => [row.id, row]));

      const sent: {
        id: string;
        communityId: string;
        userId: string;
        createdAt: Date;
      }[] = [];
      const refused: { name: string; message: string }[] = [];

      for (const userId of uniqueIds) {
        const target = targetsById.get(userId);
        if (!target) {
          refused.push({ name: "Unknown User", message: "User not found" });
          continue;
        }

        const existingMembership = await requireMembership(
          ctx.db,
          community.id,
          target.id,
        );
        if (existingMembership) {
          refused.push({
            name: target.name,
            message: "User is already a Member of this Community",
          });
          continue;
        }

        const existingInvite =
          await ctx.db.query.communityMemberInvites.findFirst({
            where: and(
              eq(communityMemberInvites.communityId, community.id),
              eq(communityMemberInvites.userId, target.id),
              isNull(communityMemberInvites.acceptedAt),
              isNull(communityMemberInvites.revokedAt),
            ),
          });

        if (existingInvite) {
          refused.push({
            name: target.name,
            message: "An unused Lookup invite already exists for this User",
          });
          continue;
        }

        try {
          const minted = await mintLookup(
            ctx.db,
            { kind: "community", id: community.id },
            { userId: target.id, invitedBy: appUser.id },
          );
          if (!minted.ok) {
            refused.push({
              name: target.name,
              message:
                minted.reason === "unused_exists"
                  ? "An unused Lookup invite already exists for this User"
                  : "Failed to create Lookup invite",
            });
            continue;
          }

          sent.push({
            id: minted.invite.id,
            communityId: minted.invite.hostId,
            userId: minted.invite.userId,
            createdAt: minted.invite.createdAt,
          });
        } catch {
          refused.push({
            name: target.name,
            message: "An unused Lookup invite already exists for this User",
          });
        }
      }

      return { sent, refused };
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const rows = await listLookup(ctx.db, {
        kind: "community",
        id: community.id,
      });

      return rows;
    }),

  revokeLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const invite = await ctx.db.query.communityMemberInvites.findFirst({
        where: eq(communityMemberInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite not found",
        });
      }

      const community = await requireLiveCommunity(ctx.db, invite.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Lookup invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      const revoked = await revokeLookup(
        ctx.db,
        { kind: "community", id: community.id },
        invite.id,
      );
      if (!revoked.ok && revoked.reason === "already_accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Lookup invites cannot be revoked",
        });
      }
      if (!revoked.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke Lookup invite",
        });
      }

      return { ok: true as const };
    }),

  pendingLookupInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);

    const rows = await ctx.db.query.communityMemberInvites.findMany({
      where: and(
        eq(communityMemberInvites.userId, appUser.id),
        isNull(communityMemberInvites.acceptedAt),
        isNull(communityMemberInvites.revokedAt),
      ),
      with: {
        community: {
          columns: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      communityId: row.communityId,
      communityName: row.community.name,
      invitedBy: {
        id: row.invitedBy.id,
        name: row.invitedBy.name,
        email: row.invitedBy.email,
      },
      createdAt: row.createdAt,
    }));
  }),

  acceptLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const invite = await ctx.db.query.communityMemberInvites.findFirst({
        where: eq(communityMemberInvites.id, input.inviteId),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite is not available",
        });
      }

      if (invite.userId !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is for a different User",
        });
      }

      const community = await requireCommunity(ctx.db, invite.communityId);
      const accepted = await acceptLookup(
        ctx.db,
        { kind: "community", id: community.id },
        { inviteId: invite.id, userId: appUser.id },
      );
      if (!accepted.ok) {
        if (accepted.reason === "frozen" || accepted.reason === "not_found") {
          throwInviteFrozen(
            { kind: "community", id: community.id },
            "accept",
            accepted.reason,
          );
        }
        if (accepted.reason === "wrong_user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invite is for a different User",
          });
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite is not available",
        });
      }

      return {
        communityId: community.id,
        alreadyMember: accepted.alreadyMember,
      };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const newest = await ctx.db.query.communityInviteLinks.findFirst({
        where: and(
          eq(communityInviteLinks.communityId, community.id),
          gt(communityInviteLinks.expiresAt, new Date()),
        ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      if (!newest) {
        return null;
      }

      return {
        id: newest.id,
        inviteUrl: communityInviteLinkUrl(
          getAppOrigin(ctx.headers),
          newest.token,
        ),
        createdAt: newest.createdAt,
        expiresAt: newest.expiresAt,
      };
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const minted = await mintLink(
        ctx.db,
        { kind: "community", id: community.id },
        { createdBy: appUser.id },
      );
      if (!minted.ok) {
        throwInviteFrozen(
          { kind: "community", id: community.id },
          "mint",
          minted.reason === "frozen" ? "frozen" : "not_found",
        );
      }

      return {
        id: minted.link.id,
        inviteUrl: communityInviteLinkUrl(
          getAppOrigin(ctx.headers),
          minted.link.token,
        ),
        createdAt: minted.link.createdAt,
        expiresAt: minted.link.expiresAt,
      };
    }),

  previewInviteLink: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const previewed = await previewLink(ctx.db, "community", input.token);
      if (previewed.status === "ready") {
        return {
          status: "ready" as const,
          communityName: previewed.name,
        };
      }
      return { status: previewed.status };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      const accepted = await acceptLink(ctx.db, "community", {
        token: input.token,
        userId: appUser.id,
      });
      if (!accepted.ok) {
        if (accepted.reason === "frozen") {
          throwInviteFrozen({ kind: "community", id: "" }, "accept", "frozen");
        }
        if (accepted.reason === "already_member") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already a Member of this Community",
          });
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is not available",
        });
      }

      return {
        communityId: accepted.hostId,
        alreadyMember: accepted.alreadyMember,
      };
    }),

  searchLiveVenues: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
        "Only Owner or Admin can search Venues",
      );

      refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
        frozenMessage: "Cannot search Venues for an archived Community",
      });

      const query = input.query;
      const rows = await ctx.db.query.venues.findMany({
        where: and(
          liveVenuesWhere(),
          query
            ? or(
                ilike(venues.name, `%${query}%`),
                ilike(venues.city, `%${query}%`),
                ilike(venues.country, `%${query}%`),
              )
            : undefined,
        ),
        columns: {
          id: true,
          name: true,
          city: true,
          country: true,
          logoImageUrl: true,
        },
        with: {
          courts: {
            columns: {
              id: true,
              name: true,
              createdAt: true,
            },
            orderBy: (table, { asc }) => [asc(table.createdAt)],
          },
        },
        orderBy: (table, { asc }) => [
          asc(table.name),
          asc(table.city),
          asc(table.country),
        ],
      });

      return rows;
    }),

  requestVenueLink: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        venueId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
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

      const venue = await ctx.db.query.venues.findFirst({
        where: eq(venues.id, input.venueId),
        columns: { id: true, archivedAt: true },
      });

      if (!venue) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "catalog", {
        frozenMessage: "Cannot request a link to a Soft-archived Venue",
        notFoundMessage: "Venue not found",
      });

      const pending = await ctx.db.query.venueLinkRequests.findFirst({
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
        const [created] = await ctx.db
          .insert(venueLinkRequests)
          .values({
            communityId: community.id,
            venueId: venue.id,
            requestedBy: appUser.id,
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
    }),

  unlinkVenue: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
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

      await ctx.db
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
    }),
});
