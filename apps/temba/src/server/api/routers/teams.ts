import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  communitySports,
  teamEmailInvites,
  teamLinkRequests,
  TeamLinkRequestStatusEnum,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
  type GroupSportEnum,
} from "@repo/db";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  createOpaqueToken,
  getAppOrigin,
  normalizeInviteEmail,
  teamEmailInviteUrl,
} from "~/server/invites/tokens";
import { sendTeamEmailInviteMail } from "~/server/mail/send-team-email-invite";

const sportSchema = z.enum(["padel", "football"]);

type DbClient = typeof db;

function optionalTeamName(name: string | undefined) {
  if (!name || name.length === 0) {
    return null;
  }
  return name;
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

async function requireTeam(database: DbClient, id: string) {
  const team = await database.query.teams.findFirst({
    where: eq(teams.id, id),
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  return team;
}

async function refuseIfLinkedCommunityArchived(
  database: DbClient,
  team: { communityId: string | null },
  message: string,
) {
  if (!team.communityId) {
    return;
  }

  const community = await database.query.communities.findFirst({
    where: eq(communities.id, team.communityId),
    columns: { archivedAt: true },
  });

  if (community?.archivedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }
}

async function listTeamMembers(database: DbClient, teamId: string) {
  return database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

async function unusedInviteForTeam(database: DbClient, teamId: string) {
  return database.query.teamMemberInvites.findFirst({
    where: and(
      eq(teamMemberInvites.teamId, teamId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

async function unusedEmailInviteForTeam(database: DbClient, teamId: string) {
  return database.query.teamEmailInvites.findFirst({
    where: and(
      eq(teamEmailInvites.teamId, teamId),
      isNull(teamEmailInvites.acceptedAt),
      isNull(teamEmailInvites.revokedAt),
    ),
  });
}

async function hasUnusedOpenSeatInvite(database: DbClient, teamId: string) {
  const inApp = await unusedInviteForTeam(database, teamId);
  if (inApp) {
    return true;
  }
  const email = await unusedEmailInviteForTeam(database, teamId);
  return Boolean(email);
}

async function unusedInviteForUserOnTeam(
  database: DbClient,
  teamId: string,
  userId: string,
) {
  return database.query.teamMemberInvites.findFirst({
    where: and(
      eq(teamMemberInvites.teamId, teamId),
      eq(teamMemberInvites.userId, userId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
  });
}

/**
 * Global unordered pair is reserved when both Users sit on the same Team,
 * or an unused in-app invite targets one User from a Team the other sits on.
 */
async function unorderedPairIsReserved(
  database: DbClient,
  userIdA: string,
  userIdB: string,
  excludeInviteId?: string,
) {
  if (userIdA === userIdB) {
    return true;
  }

  const aMemberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userIdA),
    columns: { teamId: true },
  });
  const aTeamIds = aMemberships.map((row) => row.teamId);

  if (aTeamIds.length > 0) {
    const shared = await database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, userIdB),
        inArray(teamMembers.teamId, aTeamIds),
      ),
      columns: { id: true },
    });
    if (shared) {
      return true;
    }
  }

  const pending = await database.query.teamMemberInvites.findMany({
    where: and(
      or(
        eq(teamMemberInvites.userId, userIdA),
        eq(teamMemberInvites.userId, userIdB),
      ),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    columns: { id: true, teamId: true, userId: true },
  });

  const pendingExceptCurrent = excludeInviteId
    ? pending.filter((row) => row.id !== excludeInviteId)
    : pending;

  if (pendingExceptCurrent.length === 0) {
    return false;
  }

  const pendingTeamIds = [
    ...new Set(pendingExceptCurrent.map((row) => row.teamId)),
  ];
  const pendingMembers = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, pendingTeamIds),
    columns: { teamId: true, userId: true },
  });

  const membersByTeam = new Map<string, string[]>();
  for (const row of pendingMembers) {
    const list = membersByTeam.get(row.teamId) ?? [];
    list.push(row.userId);
    membersByTeam.set(row.teamId, list);
  }

  for (const invite of pendingExceptCurrent) {
    const members = membersByTeam.get(invite.teamId) ?? [];
    const inviteeIsA = invite.userId === userIdA;
    const otherId = inviteeIsA ? userIdB : userIdA;
    if (members.includes(otherId)) {
      return true;
    }
  }

  return false;
}

export const teamsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const created = await ctx.db.transaction(async (tx) => {
        const [team] = await tx
          .insert(teams)
          .values({
            name: optionalTeamName(input.name),
            sport: input.sport,
            communityId: null,
            createdBy: appUser.id,
          })
          .returning();

        if (!team) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Team",
          });
        }

        await tx.insert(teamMembers).values({
          teamId: team.id,
          userId: appUser.id,
        });

        return team;
      });

      return {
        id: created.id,
        name: created.name,
        displayName: teamDisplayName(created.name, [appUser.name]),
        sport: created.sport as GroupSportEnum,
        communityId: created.communityId,
        createdBy: created.createdBy,
        createdAt: created.createdAt,
        gamesPlayed: created.gamesPlayed,
        wins: created.wins,
        losses: created.losses,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const memberships = await ctx.db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, appUser.id),
      with: {
        team: {
          with: {
            community: true,
          },
        },
      },
    });

    const teamIds = memberships.map((membership) => membership.team.id);
    const memberRows =
      teamIds.length === 0
        ? []
        : await ctx.db.query.teamMembers.findMany({
            where: inArray(teamMembers.teamId, teamIds),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          });

    const membersByTeam = new Map<string, typeof memberRows>();
    for (const row of memberRows) {
      const list = membersByTeam.get(row.teamId) ?? [];
      list.push(row);
      membersByTeam.set(row.teamId, list);
    }

    return memberships.map((membership) => {
      const team = membership.team;
      const members = membersByTeam.get(team.id) ?? [];
      const memberNames = members.map((member) => member.user.name);
      const community = team.community;

      return {
        id: team.id,
        name: team.name,
        displayName: teamDisplayName(team.name, memberNames),
        sport: team.sport as GroupSportEnum,
        community: community
          ? {
              id: community.id,
              name: community.name,
              archivedAt: community.archivedAt,
            }
          : null,
        memberCount: members.length,
        incomplete: members.length < 2,
      };
    });
  }),

  pendingInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const rows = await ctx.db.query.teamMemberInvites.findMany({
      where: and(
        eq(teamMemberInvites.userId, appUser.id),
        isNull(teamMemberInvites.acceptedAt),
        isNull(teamMemberInvites.revokedAt),
      ),
      with: {
        team: true,
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
      teamId: row.team.id,
      displayName: teamDisplayName(row.team.name, [row.invitedBy.name]),
      sport: row.team.sport as GroupSportEnum,
      invitedBy: {
        id: row.invitedBy.id,
        name: row.invitedBy.name,
        email: row.invitedBy.email,
      },
      createdAt: row.createdAt,
    }));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.id);

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, appUser.id),
        ),
      });

      let communityMembership = null;
      let community = null;

      if (team.communityId) {
        community = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, team.communityId),
        });
        communityMembership = await ctx.db.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, team.communityId),
            eq(communityMembers.userId, appUser.id),
          ),
        });
      }

      const pendingInvite = await unusedInviteForUserOnTeam(
        ctx.db,
        team.id,
        appUser.id,
      );

      const isMember = Boolean(membership);
      const canOpenLinkedAsCommunityMember = Boolean(
        team.communityId && communityMembership,
      );
      const canOpenAsInvitee = Boolean(pendingInvite);

      if (!isMember && !canOpenLinkedAsCommunityMember && !canOpenAsInvitee) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot open this Team",
        });
      }

      const memberRows = await listTeamMembers(ctx.db, team.id);
      const memberNames = memberRows.map((row) => row.user.name);
      const incomplete = memberRows.length < 2;
      const canInvite =
        isMember &&
        incomplete &&
        team.createdBy === appUser.id &&
        !community?.archivedAt;
      const unusedInvite = canInvite
        ? await unusedInviteForTeam(ctx.db, team.id)
        : null;
      const unusedEmailInvite = canInvite
        ? await unusedEmailInviteForTeam(ctx.db, team.id)
        : null;

      const canDissolve =
        isMember && (team.createdBy === appUser.id || !incomplete);
      const canAccept =
        Boolean(pendingInvite) && !isMember && !community?.archivedAt;

      const pendingLinkRequest = isMember
        ? await ctx.db.query.teamLinkRequests.findFirst({
            where: and(
              eq(teamLinkRequests.teamId, team.id),
              eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
            ),
            with: {
              community: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        : null;

      const canRequestLink =
        isMember && !incomplete && !team.communityId && !pendingLinkRequest;
      const canUnlink = isMember && Boolean(team.communityId);

      return {
        id: team.id,
        name: team.name,
        displayName: teamDisplayName(team.name, memberNames),
        sport: team.sport as GroupSportEnum,
        communityId: team.communityId,
        isLoose: !team.communityId,
        linkState: team.communityId
          ? ("linked" as const)
          : ("unattached" as const),
        gamesPlayed: team.gamesPlayed,
        wins: team.wins,
        losses: team.losses,
        incomplete,
        waitingForPartner: incomplete,
        community: community
          ? {
              id: community.id,
              name: community.name,
              archivedAt: community.archivedAt,
            }
          : null,
        createdBy: team.createdBy,
        createdAt: team.createdAt,
        membership: membership ? { id: membership.id } : null,
        members: memberRows.map((row) => ({
          id: row.id,
          userId: row.user.id,
          name: row.user.name,
          isCreator: row.user.id === team.createdBy,
          isViewer: row.user.id === appUser.id,
        })),
        canInvite,
        canDissolve,
        canAccept,
        canRequestLink,
        canUnlink,
        pendingLinkRequest: pendingLinkRequest
          ? {
              id: pendingLinkRequest.id,
              community: pendingLinkRequest.community,
              createdAt: pendingLinkRequest.createdAt,
            }
          : null,
        pendingInvite: pendingInvite
          ? { id: pendingInvite.id, createdAt: pendingInvite.createdAt }
          : null,
        unusedInvite:
          canInvite && unusedInvite
            ? {
                id: unusedInvite.id,
                createdAt: unusedInvite.createdAt,
                user: unusedInvite.user,
              }
            : null,
        unusedEmailInvite:
          canInvite && unusedEmailInvite
            ? {
                id: unusedEmailInvite.id,
                email: unusedEmailInvite.email,
                inviteUrl: teamEmailInviteUrl(
                  getAppOrigin(ctx.headers),
                  unusedEmailInvite.token,
                ),
                createdAt: unusedEmailInvite.createdAt,
              }
            : null,
      };
    }),

  inviteInApp: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        email: z.string().trim().email().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      await refuseIfLinkedCommunityArchived(
        ctx.db,
        team,
        "Cannot invite into a Team linked to an archived Community",
      );

      if (team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only the creator can invite a partner while the Team is incomplete",
        });
      }

      const memberRows = await listTeamMembers(ctx.db, team.id);
      if (memberRows.length >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is full",
        });
      }

      const email = normalizeInviteEmail(input.email);
      const invitee = await ctx.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!invitee) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No User with that email",
        });
      }

      if (invitee.id === appUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot invite yourself",
        });
      }

      const alreadyMember = memberRows.some((row) => row.userId === invitee.id);
      if (alreadyMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this Team",
        });
      }

      if (await hasUnusedOpenSeatInvite(ctx.db, team.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Revoke the unused invite before sending a new one",
        });
      }

      if (await unorderedPairIsReserved(ctx.db, appUser.id, invitee.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This pair already has a Team or a pending invite",
        });
      }

      const [created] = await ctx.db
        .insert(teamMemberInvites)
        .values({
          teamId: team.id,
          userId: invitee.id,
          invitedBy: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Team invite",
        });
      }

      return {
        id: created.id,
        teamId: created.teamId,
        userId: created.userId,
        createdAt: created.createdAt,
      };
    }),

  listInAppInvites: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      if (team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can list Team invites",
        });
      }

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, appUser.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can list Team invites",
        });
      }

      const rows = await ctx.db.query.teamMemberInvites.findMany({
        where: and(
          eq(teamMemberInvites.teamId, team.id),
          isNull(teamMemberInvites.acceptedAt),
          isNull(teamMemberInvites.revokedAt),
        ),
        with: {
          user: {
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
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
    }),

  revokeInAppInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.teamMemberInvites.findFirst({
        where: eq(teamMemberInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team invite not found",
        });
      }

      const team = await requireTeam(ctx.db, invite.teamId);

      if (team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can revoke Team invites",
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      await ctx.db
        .update(teamMemberInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(teamMemberInvites.id, invite.id));

      return { ok: true as const };
    }),

  acceptInAppInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.teamMemberInvites.findFirst({
        where: eq(teamMemberInvites.id, input.inviteId),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team invite is not available",
        });
      }

      if (invite.userId !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is for a different User",
        });
      }

      const team = await requireTeam(ctx.db, invite.teamId);
      await refuseIfLinkedCommunityArchived(
        ctx.db,
        team,
        "Cannot accept a Team invite while the linked Community is archived",
      );
      const memberRows = await listTeamMembers(ctx.db, team.id);

      const existing = memberRows.find((row) => row.userId === appUser.id);
      if (existing) {
        await ctx.db
          .update(teamMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamMemberInvites.id, invite.id),
              isNull(teamMemberInvites.acceptedAt),
              isNull(teamMemberInvites.revokedAt),
            ),
          );

        return {
          ok: true as const,
          teamId: team.id,
          alreadyMember: true as const,
        };
      }

      if (memberRows.length >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is full",
        });
      }

      const creatorId = memberRows[0]?.userId ?? team.createdBy;
      if (
        await unorderedPairIsReserved(ctx.db, creatorId, appUser.id, invite.id)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This pair already has a Team or a pending invite",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(teamMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamMemberInvites.id, invite.id),
              isNull(teamMemberInvites.acceptedAt),
              isNull(teamMemberInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Team invite is not available",
          });
        }

        await tx.insert(teamMembers).values({
          teamId: team.id,
          userId: appUser.id,
        });
      });

      return {
        ok: true as const,
        teamId: team.id,
        alreadyMember: false as const,
      };
    }),

  sendEmailInvite: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        email: z.string().trim().email().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      await refuseIfLinkedCommunityArchived(
        ctx.db,
        team,
        "Cannot invite into a Team linked to an archived Community",
      );

      if (team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only the creator can invite a partner while the Team is incomplete",
        });
      }

      const memberRows = await listTeamMembers(ctx.db, team.id);
      if (memberRows.length >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is full",
        });
      }

      const email = normalizeInviteEmail(input.email);
      if (normalizeInviteEmail(appUser.email) === email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot invite yourself",
        });
      }

      if (await hasUnusedOpenSeatInvite(ctx.db, team.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Revoke the unused invite before sending a new one",
        });
      }

      const attachedUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (attachedUser) {
        const alreadyMember = memberRows.some(
          (row) => row.userId === attachedUser.id,
        );
        if (alreadyMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this Team",
          });
        }
      }

      const token = createOpaqueToken();
      const [created] = await ctx.db
        .insert(teamEmailInvites)
        .values({
          teamId: team.id,
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

      const inviteUrl = teamEmailInviteUrl(
        getAppOrigin(ctx.headers),
        created.token,
      );

      await sendTeamEmailInviteMail({
        to: email,
        teamName: team.name ?? "Team",
        inviteUrl,
      });

      return {
        id: created.id,
        email: created.email,
        inviteUrl,
        attachedUserId: created.userId,
      };
    }),

  revokeEmailInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.teamEmailInvites.findFirst({
        where: eq(teamEmailInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite not found",
        });
      }

      const team = await requireTeam(ctx.db, invite.teamId);

      if (team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can revoke Team invites",
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Email invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      await ctx.db
        .update(teamEmailInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(teamEmailInvites.id, invite.id));

      return { ok: true as const };
    }),

  previewEmailInvite: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.query.teamEmailInvites.findFirst({
        where: eq(teamEmailInvites.token, input.token),
        with: {
          team: true,
        },
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        return { status: "invalid" as const };
      }

      if (invite.team.communityId) {
        const linked = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, invite.team.communityId),
          columns: { archivedAt: true },
        });
        if (linked?.archivedAt) {
          return { status: "unavailable" as const };
        }
      }

      const memberRows = await listTeamMembers(ctx.db, invite.team.id);
      if (memberRows.length >= 2) {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        teamName: teamDisplayName(
          invite.team.name,
          memberRows.map((row) => row.user.name),
        ),
        invitedEmail: invite.email,
      };
    }),

  acceptEmailInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.teamEmailInvites.findFirst({
        where: eq(teamEmailInvites.token, input.token),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite is not available",
        });
      }

      const team = await requireTeam(ctx.db, invite.teamId);

      if (normalizeInviteEmail(appUser.email) !== invite.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Signed-in email does not match this Email invite. The invite was not consumed.",
        });
      }

      await refuseIfLinkedCommunityArchived(
        ctx.db,
        team,
        "Cannot accept a Team invite while the linked Community is archived",
      );

      const memberRows = await listTeamMembers(ctx.db, team.id);
      const existing = memberRows.find((row) => row.userId === appUser.id);

      if (existing) {
        await ctx.db
          .update(teamEmailInvites)
          .set({
            acceptedAt: new Date(),
            userId: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamEmailInvites.id, invite.id),
              isNull(teamEmailInvites.acceptedAt),
              isNull(teamEmailInvites.revokedAt),
            ),
          );

        return {
          teamId: team.id,
          alreadyMember: true as const,
        };
      }

      if (memberRows.length >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is full",
        });
      }

      const creatorId = memberRows[0]?.userId ?? team.createdBy;
      if (await unorderedPairIsReserved(ctx.db, creatorId, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This pair already has a Team or a pending invite",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(teamEmailInvites)
          .set({
            acceptedAt: new Date(),
            userId: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamEmailInvites.id, invite.id),
              isNull(teamEmailInvites.acceptedAt),
              isNull(teamEmailInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email invite is no longer available",
          });
        }

        await tx.insert(teamMembers).values({
          teamId: team.id,
          userId: appUser.id,
        });
      });

      return {
        teamId: team.id,
        alreadyMember: false as const,
      };
    }),

  requestLink: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        communityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, appUser.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only a Team member can request a Community link",
        });
      }

      const memberRows = await listTeamMembers(ctx.db, team.id);
      if (memberRows.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incomplete Teams cannot request a Community link",
        });
      }

      if (team.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is already linked to a Community",
        });
      }

      const community = await ctx.db.query.communities.findFirst({
        where: eq(communities.id, input.communityId),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request a Team link to an archived Community",
        });
      }

      const allowedSport = await ctx.db.query.communitySports.findFirst({
        where: and(
          eq(communitySports.communityId, community.id),
          eq(communitySports.sport, team.sport),
        ),
      });

      if (!allowedSport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sport is not on this Community's sports allow-list",
        });
      }

      const pending = await ctx.db.query.teamLinkRequests.findFirst({
        where: and(
          eq(teamLinkRequests.teamId, team.id),
          eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
        ),
      });

      if (pending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This Team already has a pending link request",
        });
      }

      const [created] = await ctx.db
        .insert(teamLinkRequests)
        .values({
          teamId: team.id,
          communityId: community.id,
          requestedBy: appUser.id,
          status: TeamLinkRequestStatusEnum.PENDING,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Team link request",
        });
      }

      return {
        id: created.id,
        teamId: created.teamId,
        communityId: created.communityId,
        status: created.status,
      };
    }),

  unlink: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, appUser.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only a Team member can unlink this Team",
        });
      }

      if (!team.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Team is not linked to a Community",
        });
      }

      const previousCommunityId = team.communityId;

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(teamLinkRequests)
          .set({
            status: TeamLinkRequestStatusEnum.REJECTED,
            decidedBy: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamLinkRequests.teamId, team.id),
              eq(teamLinkRequests.status, TeamLinkRequestStatusEnum.PENDING),
            ),
          );

        await tx
          .update(teams)
          .set({
            communityId: null,
            updatedAt: new Date(),
          })
          .where(eq(teams.id, team.id));
      });

      return {
        ok: true as const,
        teamId: team.id,
        communityId: previousCommunityId,
      };
    }),

  dissolve: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const team = await requireTeam(ctx.db, input.teamId);

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, appUser.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only a Team member can dissolve this Team",
        });
      }

      const memberRows = await listTeamMembers(ctx.db, team.id);
      const incomplete = memberRows.length < 2;

      if (incomplete && team.createdBy !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can dissolve an incomplete Team",
        });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(teamMemberInvites)
          .set({
            revokedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamMemberInvites.teamId, team.id),
              isNull(teamMemberInvites.acceptedAt),
              isNull(teamMemberInvites.revokedAt),
            ),
          );

        await tx
          .update(teamEmailInvites)
          .set({
            revokedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(teamEmailInvites.teamId, team.id),
              isNull(teamEmailInvites.acceptedAt),
              isNull(teamEmailInvites.revokedAt),
            ),
          );

        await tx.delete(teams).where(eq(teams.id, team.id));
      });

      return {
        ok: true as const,
        teamId: team.id,
      };
    }),
});
