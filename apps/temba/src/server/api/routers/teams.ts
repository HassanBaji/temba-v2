import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
  type GroupSportEnum,
} from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { normalizeInviteEmail } from "~/server/invites/tokens";

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
      const unusedInvite = isMember
        ? await unusedInviteForTeam(ctx.db, team.id)
        : pendingInvite
          ? await unusedInviteForTeam(ctx.db, team.id)
          : null;

      const canInvite = isMember && incomplete && team.createdBy === appUser.id;
      const canDissolve =
        isMember && (team.createdBy === appUser.id || !incomplete);
      const canAccept = Boolean(pendingInvite) && !isMember;

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

      const existingUnused = await unusedInviteForTeam(ctx.db, team.id);
      if (existingUnused) {
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

        await tx.delete(teams).where(eq(teams.id, team.id));
      });

      return {
        ok: true as const,
        teamId: team.id,
      };
    }),
});
