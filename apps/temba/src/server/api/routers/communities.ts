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
  groupMembers,
  groups,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMembers,
  teams,
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
  venues,
  type GroupSportEnum,
} from "@repo/db";

import { type db } from "~/server/db";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { resolveLookupUser } from "~/server/invites/resolve-lookup-user";
import {
  inviteLinkExpiresAt,
  isInviteLinkLive,
} from "~/server/invites/invite-link-expiry";
import {
  communityInviteLinkUrl,
  createOpaqueToken,
  getAppOrigin,
} from "~/server/invites/tokens";
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
type VenueLinkStatus = "pending" | "approved" | "rejected";

function isStaffRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

function asRole(role: string): CommunityRole {
  return role as CommunityRole;
}

function asJoinStatus(status: string): JoinRequestStatus {
  return status as JoinRequestStatus;
}

function asVenueLinkStatus(status: string): VenueLinkStatus {
  return status as VenueLinkStatus;
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

async function loadMemberVenue(database: DbClient, venueId: string | null) {
  if (!venueId) {
    return null;
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      logoImageUrl: true,
      archivedAt: true,
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
  });

  return venue ?? null;
}

function mapVenueLinkRequestRow(row: {
  id: string;
  status: string;
  createdAt: Date;
  venue: { id: string; name: string; city: string; country: string };
}) {
  return {
    id: row.id,
    status: asVenueLinkStatus(row.status),
    createdAt: row.createdAt,
    venue: {
      id: row.venue.id,
      name: row.venue.name,
      city: row.venue.city,
      country: row.venue.country,
    },
  };
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

async function requireLiveCommunity(database: DbClient, id: string) {
  const community = await requireCommunity(database, id);

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
      const canManageLookupInvites =
        !community.archivedAt && isStaffRole(membership?.role);
      const canManageInviteLinks =
        !community.archivedAt && isStaffRole(membership?.role);
      const canCreateClubGroup =
        !community.archivedAt && isStaffRole(membership?.role);
      const canManageSports = isStaffRole(membership?.role);
      const canManageRoles = membership?.role === "owner";
      const canSoftArchive =
        !community.archivedAt && isStaffRole(membership?.role);
      const canUnarchive =
        Boolean(community.archivedAt) && isStaffRole(membership?.role);
      const canManageTeamLinks =
        !community.archivedAt && isStaffRole(membership?.role);
      const canManageVenueLink =
        !community.archivedAt && isStaffRole(membership?.role);

      const venue = membership
        ? await loadMemberVenue(ctx.db, community.venueId)
        : null;

      let venueLinkRequest: ReturnType<typeof mapVenueLinkRequestRow> | null =
        null;
      if (isStaffRole(membership?.role)) {
        const pendingRequest = await ctx.db.query.venueLinkRequests.findFirst({
          where: and(
            eq(venueLinkRequests.communityId, community.id),
            eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
          ),
          with: {
            venue: {
              columns: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        });
        if (pendingRequest) {
          venueLinkRequest = mapVenueLinkRequestRow(pendingRequest);
        } else {
          const lastRejected = await ctx.db.query.venueLinkRequests.findFirst({
            where: and(
              eq(venueLinkRequests.communityId, community.id),
              eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.REJECTED),
            ),
            with: {
              venue: {
                columns: {
                  id: true,
                  name: true,
                  city: true,
                  country: true,
                },
              },
            },
            orderBy: (table, { desc }) => [desc(table.createdAt)],
          });
          if (lastRejected) {
            venueLinkRequest = mapVenueLinkRequestRow(lastRejected);
          }
        }
      }

      const canRequestVenueLink =
        canManageVenueLink &&
        !community.venueId &&
        venueLinkRequest?.status !== "pending";
      const canUnlinkVenue = canManageVenueLink && Boolean(community.venueId);

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
        canManageLookupInvites,
        canManageInviteLinks,
        canCreateClubGroup,
        canManageSports,
        canManageRoles,
        canSoftArchive,
        canUnarchive,
        canLeave,
        linkedTeamBlocksLeave,
        canManageTeamLinks,
        canManageVenueLink,
        canRequestVenueLink,
        canUnlinkVenue,
        venue,
        venueLinkRequest,
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

      // Unarchive restores join rules. Live Invite link tokens stay valid
      // until each expires.
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

      const community = await requireCommunity(ctx.db, request.communityId);
      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot approve Team link requests for an archived Community",
        });
      }

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

      const community = await requireCommunity(ctx.db, request.communityId);
      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reject Team link requests for an archived Community",
        });
      }

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

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        query: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const invitee = await resolveLookupUser(ctx.db, input.query);

      const existingMembership = await requireMembership(
        ctx.db,
        community.id,
        invitee.id,
      );
      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a Member of this Community",
        });
      }

      const existingInvite =
        await ctx.db.query.communityMemberInvites.findFirst({
          where: and(
            eq(communityMemberInvites.communityId, community.id),
            eq(communityMemberInvites.userId, invitee.id),
            isNull(communityMemberInvites.acceptedAt),
            isNull(communityMemberInvites.revokedAt),
          ),
        });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An unused Lookup invite already exists for this User",
        });
      }

      const [created] = await ctx.db
        .insert(communityMemberInvites)
        .values({
          communityId: community.id,
          userId: invitee.id,
          invitedBy: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Lookup invite",
        });
      }

      return {
        id: created.id,
        communityId: created.communityId,
        userId: created.userId,
        createdAt: created.createdAt,
      };
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const rows = await ctx.db.query.communityMemberInvites.findMany({
        where: and(
          eq(communityMemberInvites.communityId, community.id),
          isNull(communityMemberInvites.acceptedAt),
          isNull(communityMemberInvites.revokedAt),
        ),
        with: {
          user: true,
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
    }),

  revokeLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

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

      const [updated] = await ctx.db
        .update(communityMemberInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communityMemberInvites.id, invite.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke Lookup invite",
        });
      }

      return { ok: true as const };
    }),

  pendingLookupInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

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
      const appUser = await resolveAppUser();

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
        await ctx.db
          .update(communityMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(communityMemberInvites.id, invite.id),
              isNull(communityMemberInvites.acceptedAt),
              isNull(communityMemberInvites.revokedAt),
            ),
          );

        return {
          communityId: community.id,
          alreadyMember: true as const,
        };
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(communityMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(communityMemberInvites.id, invite.id),
              isNull(communityMemberInvites.acceptedAt),
              isNull(communityMemberInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Lookup invite is no longer available",
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

  getInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
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
      const appUser = await resolveAppUser();
      const community = await requireLiveCommunity(ctx.db, input.communityId);
      await requireStaff(ctx.db, community.id, appUser.id);

      const createdAt = new Date();
      const [created] = await ctx.db
        .insert(communityInviteLinks)
        .values({
          communityId: community.id,
          createdBy: appUser.id,
          token: createOpaqueToken(),
          createdAt,
          expiresAt: inviteLinkExpiresAt(createdAt),
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
        expiresAt: created.expiresAt,
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

      if (!link || !isInviteLinkLive(link.expiresAt)) {
        return { status: "invalid" as const };
      }

      if (link.community.archivedAt) {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        communityName: link.community.name,
      };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const link = await ctx.db.query.communityInviteLinks.findFirst({
        where: eq(communityInviteLinks.token, input.token),
      });

      if (!link || !isInviteLinkLive(link.expiresAt)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is not available",
        });
      }

      const community = await requireCommunity(ctx.db, link.communityId);

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
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a Member of this Community",
        });
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
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a Member of this Community",
        });
      }

      return {
        communityId: community.id,
        alreadyMember: false as const,
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
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
        "Only Owner or Admin can search Venues",
      );

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot search Venues for an archived Community",
        });
      }

      const query = input.query;
      const rows = await ctx.db.query.venues.findMany({
        where: and(
          isNull(venues.archivedAt),
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
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
        "Only Owner or Admin can request a Venue link",
      );

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request a Venue link for an archived Community",
        });
      }

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

      if (venue.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request a link to a Soft-archived Venue",
        });
      }

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
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);
      await requireStaff(
        ctx.db,
        community.id,
        appUser.id,
        "Only Owner or Admin can unlink a Venue",
      );

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot unlink a Venue from an archived Community",
        });
      }

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
