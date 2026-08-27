import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityEmailInvites,
  communityInviteLinks,
  communityJoinRequests,
  communityMembers,
  communitySports,
  CommunityJoinRequestStatusEnum,
  CommunityRoleEnum,
  groupMembers,
  groups,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  teams,
  user,
  type GroupSportEnum,
} from "@repo/db";

import { type db } from "~/server/db";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  communityEmailInviteUrl,
  communityInviteLinkUrl,
  createOpaqueToken,
  getAppOrigin,
  normalizeInviteEmail,
} from "~/server/invites/tokens";
import { sendCommunityEmailInviteMail } from "~/server/mail/send-community-email-invite";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

type DbClient = typeof db;
type CommunityRole = "owner" | "admin" | "member";
type JoinRequestStatus = "pending" | "approved" | "rejected";

function isStaffRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

function asRole(role: string): CommunityRole {
  return role as CommunityRole;
}

function asJoinStatus(status: string): JoinRequestStatus {
  return status as JoinRequestStatus;
}

function teamDisplayName(name: string | null, memberNames: string[]) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (memberNames.length === 0) {
    return "Untitled Team";
  }
  return memberNames.join(" & ");
}

async function requireCommunity(database: DbClient, id: string) {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, id),
  });

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }

  return community;
}

async function requireMembership(
  database: DbClient,
  communityId: string,
  userId: string,
) {
  const membership = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId),
    ),
  });

  return membership ?? null;
}

async function requireStaff(
  database: DbClient,
  communityId: string,
  userId: string,
  message = "Only Owner or Admin can manage this Community",
) {
  const membership = await requireMembership(database, communityId, userId);

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }

  return membership;
}

async function requireOwner(
  database: DbClient,
  communityId: string,
  userId: string,
) {
  const membership = await requireMembership(database, communityId, userId);

  if (membership?.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Owners can change Community roles",
    });
  }

  return membership;
}

async function countOwners(database: DbClient, communityId: string) {
  const owners = await database.query.communityMembers.findMany({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.role, CommunityRoleEnum.OWNER),
    ),
  });

  return owners.length;
}

/** Lock Owner rows so last-Owner leave/demote cannot race to zero Owners. */
async function lockOwnersForUpdate(
  tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0],
  communityId: string,
) {
  return tx
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, CommunityRoleEnum.OWNER),
      ),
    )
    .for("update");
}

async function requireLivePrivateCommunity(database: DbClient, id: string) {
  const community = await requireCommunity(database, id);

  if (community.type !== "private") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Community Public has no Email invite or Invite link",
    });
  }

  if (community.archivedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot manage invites for an archived Community",
    });
  }

  return community;
}

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
      const uniqueSports = [...new Set(input.sports)];
      if (uniqueSports.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one sport is required",
        });
      }

      const appUser = await resolveAppUser();

      const community = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(communities)
          .values({
            name: input.name,
            description: input.description,
            type: input.type,
            createdBy: appUser.id,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create community",
          });
        }

        await tx.insert(communityMembers).values({
          communityId: created.id,
          userId: appUser.id,
          role: CommunityRoleEnum.OWNER,
        });

        await tx.insert(communitySports).values(
          uniqueSports.map((sport) => ({
            communityId: created.id,
            sport,
          })),
        );

        return created;
      });

      return community;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const community = await ctx.db.query.communities.findFirst({
        where: eq(communities.id, input.id),
        with: {
          sports: true,
        },
      });

      if (!community) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );

      const joinRequest = await ctx.db.query.communityJoinRequests.findFirst({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(communityJoinRequests.userId, appUser.id),
        ),
      });

      const canManageJoinRequests =
        community.type === "public" &&
        !community.archivedAt &&
        isStaffRole(membership?.role);
      const canManageInvites =
        community.type === "private" &&
        !community.archivedAt &&
        isStaffRole(membership?.role);
      const canCreateClubGroup =
        !community.archivedAt && isStaffRole(membership?.role);
      const canManageSports = isStaffRole(membership?.role);
      const canManageRoles = membership?.role === "owner";
      const canSoftArchive =
        !community.archivedAt && isStaffRole(membership?.role);
      const canUnarchive =
        Boolean(community.archivedAt) && isStaffRole(membership?.role);
      const canManageTeamLinks = isStaffRole(membership?.role);

      let canLeave = Boolean(membership);
      let linkedTeamBlocksLeave = false;
      if (membership?.role === "owner") {
        const ownerCount = await countOwners(ctx.db, community.id);
        if (ownerCount <= 1) {
          canLeave = false;
        }
      }

      if (membership) {
        const teamSeats = await ctx.db.query.teamMembers.findMany({
          where: eq(teamMembers.userId, appUser.id),
          columns: { teamId: true },
        });
        const teamIds = teamSeats.map((row) => row.teamId);
        if (teamIds.length > 0) {
          const linkedSeat = await ctx.db.query.teams.findFirst({
            where: and(
              eq(teams.communityId, community.id),
              inArray(teams.id, teamIds),
            ),
            columns: { id: true },
          });
          if (linkedSeat) {
            linkedTeamBlocksLeave = true;
            canLeave = false;
          }
        }
      }

      const clubGroups = await ctx.db.query.groups.findMany({
        where: eq(groups.communityId, community.id),
        orderBy: (table, { asc }) => [asc(table.name)],
      });

      const linkedTeamRows = membership
        ? await ctx.db.query.teams.findMany({
            where: eq(teams.communityId, community.id),
            orderBy: (table, { asc }) => [asc(table.name)],
          })
        : [];

      const memberGroupIds = new Set<string>();
      if (clubGroups.length > 0) {
        const myGroupMemberships = await ctx.db.query.groupMembers.findMany({
          where: and(
            eq(groupMembers.userId, appUser.id),
            inArray(
              groupMembers.groupId,
              clubGroups.map((group) => group.id),
            ),
          ),
        });
        for (const row of myGroupMemberships) {
          memberGroupIds.add(row.groupId);
        }
      }

      const linkedTeamIds = linkedTeamRows.map((team) => team.id);
      const linkedTeamMemberRows =
        linkedTeamIds.length === 0
          ? []
          : await ctx.db.query.teamMembers.findMany({
              where: inArray(teamMembers.teamId, linkedTeamIds),
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            });
      const linkedMembersByTeam = new Map<string, string[]>();
      for (const row of linkedTeamMemberRows) {
        const list = linkedMembersByTeam.get(row.teamId) ?? [];
        list.push(row.user.name);
        linkedMembersByTeam.set(row.teamId, list);
      }

      return {
        id: community.id,
        name: community.name,
        description: community.description,
        type: community.type,
        archivedAt: community.archivedAt,
        createdAt: community.createdAt,
        sports: community.sports.map(
          (sportRow) => sportRow.sport as GroupSportEnum,
        ),
        membership: membership
          ? { role: asRole(membership.role), userId: appUser.id }
          : null,
        joinRequest: joinRequest
          ? {
              id: joinRequest.id,
              status: asJoinStatus(joinRequest.status),
            }
          : null,
        canManageJoinRequests,
        canManageInvites,
        canCreateClubGroup,
        canManageSports,
        canManageRoles,
        canSoftArchive,
        canUnarchive,
        canLeave,
        linkedTeamBlocksLeave,
        canManageTeamLinks,
        groups: clubGroups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          type: group.type,
          sport: group.sport as GroupSportEnum | null,
          isMember: memberGroupIds.has(group.id),
        })),
        teams: linkedTeamRows.map((team) => ({
          id: team.id,
          name: team.name,
          displayName: teamDisplayName(
            team.name,
            linkedMembersByTeam.get(team.id) ?? [],
          ),
          sport: team.sport as GroupSportEnum,
        })),
      };
    }),

  listMembers: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Community members can list members",
        });
      }

      const rows = await ctx.db.query.communityMembers.findMany({
        where: eq(communityMembers.communityId, community.id),
        with: {
          user: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      return rows.map((row) => ({
        id: row.id,
        role: asRole(row.role),
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
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
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      await requireOwner(ctx.db, community.id, appUser.id);

      const target = await requireMembership(
        ctx.db,
        community.id,
        input.userId,
      );

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community member not found",
        });
      }

      const nextRole = input.role;
      const previousRole = asRole(target.role);

      if (previousRole === nextRole) {
        return {
          ok: true as const,
          userId: target.userId,
          role: previousRole,
        };
      }

      const demotingOwner = previousRole === "owner" && nextRole !== "owner";

      const updated = await ctx.db.transaction(async (tx) => {
        if (demotingOwner) {
          const owners = await lockOwnersForUpdate(tx, community.id);
          if (owners.length <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "The last Owner cannot demote until another Owner is promoted",
            });
          }
        }

        const [row] = await tx
          .update(communityMembers)
          .set({
            role: nextRole,
            updatedAt: new Date(),
          })
          .where(eq(communityMembers.id, target.id))
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update member role",
          });
        }

        return row;
      });

      return {
        ok: true as const,
        userId: updated.userId,
        role: asRole(updated.role),
      };
    }),

  softArchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      await requireStaff(ctx.db, community.id, appUser.id);

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community is already Soft-archived",
        });
      }

      // Soft-archive hides listing and join paths. Club Groups stay attached
      // (communityId unchanged). Invite tokens are kept, not auto-revoked.
      const [updated] = await ctx.db
        .update(communities)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communities.id, community.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to Soft-archive Community",
        });
      }

      return {
        id: updated.id,
        archivedAt: updated.archivedAt,
      };
    }),

  unarchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      await requireStaff(ctx.db, community.id, appUser.id);

      if (!community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community is not Soft-archived",
        });
      }

      // Unarchive restores join rules. The same Invite
      // link token remains active unless staff rotated or revoked it.
      const [updated] = await ctx.db
        .update(communities)
        .set({
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(communities.id, community.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unarchive Community",
        });
      }

      return {
        id: updated.id,
        archivedAt: updated.archivedAt,
      };
    }),

  leave: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );

      if (!membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of this Community",
        });
      }

      const teamSeats = await ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, appUser.id),
        columns: { teamId: true },
      });
      const linkedTeamIds = teamSeats.map((row) => row.teamId);
      if (linkedTeamIds.length > 0) {
        const linkedSeat = await ctx.db.query.teams.findFirst({
          where: and(
            eq(teams.communityId, community.id),
            inArray(teams.id, linkedTeamIds),
          ),
          columns: { id: true },
        });
        if (linkedSeat) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Leave Community is refused while you sit on a Team linked to this Community. Unlink or dissolve the Team first.",
          });
        }
      }

      const clubGroups = await ctx.db.query.groups.findMany({
        where: eq(groups.communityId, community.id),
        columns: { id: true },
      });

      // Leave removes membership only — never Soft-archives the Community.
      // Clears join-request history so Public members can re-request after leave.
      await ctx.db.transaction(async (tx) => {
        if (membership.role === "owner") {
          const owners = await lockOwnersForUpdate(tx, community.id);
          if (owners.length <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "The last Owner cannot leave until another Owner is promoted",
            });
          }
        }

        if (clubGroups.length > 0) {
          await tx.delete(groupMembers).where(
            and(
              eq(groupMembers.userId, appUser.id),
              inArray(
                groupMembers.groupId,
                clubGroups.map((group) => group.id),
              ),
            ),
          );
        }

        await tx
          .delete(communityMembers)
          .where(eq(communityMembers.id, membership.id));

        await tx
          .delete(communityJoinRequests)
          .where(
            and(
              eq(communityJoinRequests.communityId, community.id),
              eq(communityJoinRequests.userId, appUser.id),
            ),
          );
      });

      return {
        ok: true as const,
        communityId: community.id,
      };
    }),

  addSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      await requireStaff(ctx.db, community.id, appUser.id);

      const existing = await ctx.db.query.communitySports.findFirst({
        where: and(
          eq(communitySports.communityId, community.id),
          eq(communitySports.sport, input.sport),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Sport is already on this Community's sports allow-list",
        });
      }

      const [created] = await ctx.db
        .insert(communitySports)
        .values({
          communityId: community.id,
          sport: input.sport,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add sport",
        });
      }

      return {
        ok: true as const,
        communityId: community.id,
        sport: created.sport as GroupSportEnum,
      };
    }),

  removeSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      await requireStaff(ctx.db, community.id, appUser.id);

      const existing = await ctx.db.query.communitySports.findFirst({
        where: and(
          eq(communitySports.communityId, community.id),
          eq(communitySports.sport, input.sport),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sport is not on this Community's sports allow-list",
        });
      }

      const clubGroupWithSport = await ctx.db.query.groups.findFirst({
        where: and(
          eq(groups.communityId, community.id),
          eq(groups.sport, input.sport),
        ),
      });

      if (clubGroupWithSport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot remove a sport while a Club Group of that sport exists in this Community",
        });
      }

      const linkedTeamWithSport = await ctx.db.query.teams.findFirst({
        where: and(
          eq(teams.communityId, community.id),
          eq(teams.sport, input.sport),
        ),
      });

      if (linkedTeamWithSport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot remove a sport while a linked Team of that sport exists in this Community",
        });
      }

      await ctx.db
        .delete(communitySports)
        .where(eq(communitySports.id, existing.id));

      return {
        ok: true as const,
        communityId: community.id,
        sport: input.sport,
      };
    }),

  listTeamLinkRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
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
      const appUser = await resolveAppUser();

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
          const existing = await tx.query.communityMembers.findFirst({
            where: and(
              eq(communityMembers.communityId, request.communityId),
              eq(communityMembers.userId, member.userId),
            ),
          });
          if (!existing) {
            await tx.insert(communityMembers).values({
              communityId: request.communityId,
              userId: member.userId,
              role: CommunityRoleEnum.MEMBER,
            });
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
      const appUser = await resolveAppUser();

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
    const appUser = await resolveAppUser();

    const memberships = await ctx.db.query.communityMembers.findMany({
      where: eq(communityMembers.userId, appUser.id),
      with: {
        community: {
          with: {
            sports: true,
          },
        },
      },
    });

    const communityIds = memberships.map(
      (membership) => membership.community.id,
    );

    const clubGroups =
      communityIds.length > 0
        ? await ctx.db.query.groups.findMany({
            where: inArray(groups.communityId, communityIds),
            orderBy: (table, { asc }) => [asc(table.name)],
          })
        : [];

    const memberGroupIds = new Set<string>();
    if (clubGroups.length > 0) {
      const myGroupMemberships = await ctx.db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.userId, appUser.id),
          inArray(
            groupMembers.groupId,
            clubGroups.map((group) => group.id),
          ),
        ),
      });
      for (const row of myGroupMemberships) {
        memberGroupIds.add(row.groupId);
      }
    }

    const groupsByCommunityId = new Map<string, typeof clubGroups>();
    for (const group of clubGroups) {
      if (!group.communityId) {
        continue;
      }
      const nested = groupsByCommunityId.get(group.communityId) ?? [];
      nested.push(group);
      groupsByCommunityId.set(group.communityId, nested);
    }

    return memberships.map((membership) => ({
      id: membership.community.id,
      name: membership.community.name,
      description: membership.community.description,
      type: membership.community.type,
      role: asRole(membership.role),
      sports: membership.community.sports.map(
        (sportRow) => sportRow.sport as GroupSportEnum,
      ),
      archivedAt: membership.community.archivedAt,
      groups: (groupsByCommunityId.get(membership.community.id) ?? []).map(
        (group) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          type: group.type,
          sport: group.sport as GroupSportEnum | null,
          isMember: memberGroupIds.has(group.id),
        }),
      ),
    }));
  }),

  requestJoin: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community Private has no request-to-join path",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request to join an archived Community",
        });
      }

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
      const appUser = await resolveAppUser();
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
      const appUser = await resolveAppUser();

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

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot approve join requests for an archived Community",
        });
      }

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

        const existingMembership = await tx.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.userId, request.userId),
          ),
        });

        if (!existingMembership) {
          await tx.insert(communityMembers).values({
            communityId: community.id,
            userId: request.userId,
            role: CommunityRoleEnum.MEMBER,
          });
        }
      });

      return { ok: true as const };
    }),

  rejectJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

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

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reject join requests for an archived Community",
        });
      }

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

  sendEmailInvite: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        email: z.string().trim().email().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const email = normalizeInviteEmail(input.email);
      const existingInvite = await ctx.db.query.communityEmailInvites.findFirst(
        {
          where: and(
            eq(communityEmailInvites.communityId, community.id),
            eq(communityEmailInvites.email, email),
            isNull(communityEmailInvites.acceptedAt),
            isNull(communityEmailInvites.revokedAt),
          ),
        },
      );

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An unused Email invite already exists for this address",
        });
      }

      const attachedUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      const token = createOpaqueToken();
      const [created] = await ctx.db
        .insert(communityEmailInvites)
        .values({
          communityId: community.id,
          email,
          userId: attachedUser?.id,
          invitedBy: appUser.id,
          token,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Email invite",
        });
      }

      const inviteUrl = communityEmailInviteUrl(
        getAppOrigin(ctx.headers),
        created.token,
      );

      await sendCommunityEmailInviteMail({
        to: email,
        communityName: community.name,
        inviteUrl,
      });

      return {
        id: created.id,
        email: created.email,
        inviteUrl,
        attachedUserId: created.userId,
      };
    }),

  listEmailInvites: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const rows = await ctx.db.query.communityEmailInvites.findMany({
        where: and(
          eq(communityEmailInvites.communityId, community.id),
          isNull(communityEmailInvites.acceptedAt),
          isNull(communityEmailInvites.revokedAt),
        ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      const origin = getAppOrigin(ctx.headers);

      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        attachedUserId: row.userId,
        inviteUrl: communityEmailInviteUrl(origin, row.token),
        createdAt: row.createdAt,
      }));
    }),

  revokeEmailInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.communityEmailInvites.findFirst({
        where: eq(communityEmailInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite not found",
        });
      }

      const community = await requireLivePrivateCommunity(
        ctx.db,
        invite.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Email invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      const [updated] = await ctx.db
        .update(communityEmailInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communityEmailInvites.id, invite.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke Email invite",
        });
      }

      return { ok: true as const };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const active = await ctx.db.query.communityInviteLinks.findFirst({
        where: and(
          eq(communityInviteLinks.communityId, community.id),
          isNull(communityInviteLinks.revokedAt),
        ),
      });

      if (!active) {
        return null;
      }

      return {
        id: active.id,
        inviteUrl: communityInviteLinkUrl(
          getAppOrigin(ctx.headers),
          active.token,
        ),
        createdAt: active.createdAt,
      };
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const existing = await ctx.db.query.communityInviteLinks.findFirst({
        where: and(
          eq(communityInviteLinks.communityId, community.id),
          isNull(communityInviteLinks.revokedAt),
        ),
      });

      if (existing) {
        return {
          id: existing.id,
          inviteUrl: communityInviteLinkUrl(
            getAppOrigin(ctx.headers),
            existing.token,
          ),
          createdAt: existing.createdAt,
        };
      }

      const [created] = await ctx.db
        .insert(communityInviteLinks)
        .values({
          communityId: community.id,
          createdBy: appUser.id,
          token: createOpaqueToken(),
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Invite link",
        });
      }

      return {
        id: created.id,
        inviteUrl: communityInviteLinkUrl(
          getAppOrigin(ctx.headers),
          created.token,
        ),
        createdAt: created.createdAt,
      };
    }),

  rotateInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const created = await ctx.db.transaction(async (tx) => {
        const active = await tx.query.communityInviteLinks.findFirst({
          where: and(
            eq(communityInviteLinks.communityId, community.id),
            isNull(communityInviteLinks.revokedAt),
          ),
        });

        if (active) {
          await tx
            .update(communityInviteLinks)
            .set({
              revokedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(communityInviteLinks.id, active.id));
        }

        const [next] = await tx
          .insert(communityInviteLinks)
          .values({
            communityId: community.id,
            createdBy: appUser.id,
            token: createOpaqueToken(),
          })
          .returning();

        if (!next) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to rotate Invite link",
          });
        }

        return next;
      });

      return {
        id: created.id,
        inviteUrl: communityInviteLinkUrl(
          getAppOrigin(ctx.headers),
          created.token,
        ),
        createdAt: created.createdAt,
      };
    }),

  revokeInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLivePrivateCommunity(
        ctx.db,
        input.communityId,
      );
      await requireStaff(ctx.db, community.id, appUser.id);

      const active = await ctx.db.query.communityInviteLinks.findFirst({
        where: and(
          eq(communityInviteLinks.communityId, community.id),
          isNull(communityInviteLinks.revokedAt),
        ),
      });

      if (!active) {
        return { ok: true as const };
      }

      await ctx.db
        .update(communityInviteLinks)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communityInviteLinks.id, active.id));

      return { ok: true as const };
    }),

  previewEmailInvite: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.query.communityEmailInvites.findFirst({
        where: eq(communityEmailInvites.token, input.token),
        with: {
          community: true,
        },
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        return { status: "invalid" as const };
      }

      if (invite.community.type !== "private" || invite.community.archivedAt) {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        communityName: invite.community.name,
        invitedEmail: invite.email,
      };
    }),

  previewInviteLink: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.query.communityInviteLinks.findFirst({
        where: eq(communityInviteLinks.token, input.token),
        with: {
          community: true,
        },
      });

      if (!link || link.revokedAt) {
        return { status: "invalid" as const };
      }

      if (link.community.type !== "private" || link.community.archivedAt) {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        communityName: link.community.name,
      };
    }),

  acceptEmailInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.communityEmailInvites.findFirst({
        where: eq(communityEmailInvites.token, input.token),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite is not available",
        });
      }

      const community = await requireCommunity(ctx.db, invite.communityId);

      if (community.type !== "private") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community Public has no Email invite",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot join an archived Community",
        });
      }

      if (normalizeInviteEmail(appUser.email) !== invite.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Signed-in email does not match this Email invite. The invite was not consumed.",
        });
      }

      const existingMembership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );
      if (existingMembership) {
        if (!invite.acceptedAt) {
          await ctx.db
            .update(communityEmailInvites)
            .set({
              acceptedAt: new Date(),
              userId: appUser.id,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(communityEmailInvites.id, invite.id),
                isNull(communityEmailInvites.acceptedAt),
                isNull(communityEmailInvites.revokedAt),
              ),
            );
        }

        return {
          communityId: community.id,
          alreadyMember: true as const,
        };
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(communityEmailInvites)
          .set({
            acceptedAt: new Date(),
            userId: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(communityEmailInvites.id, invite.id),
              isNull(communityEmailInvites.acceptedAt),
              isNull(communityEmailInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email invite is no longer available",
          });
        }

        await tx.insert(communityMembers).values({
          communityId: community.id,
          userId: appUser.id,
          role: CommunityRoleEnum.MEMBER,
        });
      });

      return {
        communityId: community.id,
        alreadyMember: false as const,
      };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const link = await ctx.db.query.communityInviteLinks.findFirst({
        where: eq(communityInviteLinks.token, input.token),
      });

      if (!link || link.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is not available",
        });
      }

      const community = await requireCommunity(ctx.db, link.communityId);

      if (community.type !== "private") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community Public has no Invite link",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot join an archived Community",
        });
      }

      const existingMembership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );
      if (existingMembership) {
        return {
          communityId: community.id,
          alreadyMember: true as const,
        };
      }

      const [inserted] = await ctx.db
        .insert(communityMembers)
        .values({
          communityId: community.id,
          userId: appUser.id,
          role: CommunityRoleEnum.MEMBER,
        })
        .onConflictDoNothing({
          target: [communityMembers.communityId, communityMembers.userId],
        })
        .returning();

      if (!inserted) {
        return {
          communityId: community.id,
          alreadyMember: true as const,
        };
      }

      return {
        communityId: community.id,
        alreadyMember: false as const,
      };
    }),
});
