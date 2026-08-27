import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  teamMembers,
  teams,
  type GroupSportEnum,
} from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";

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

      const isMember = Boolean(membership);
      const canOpenLinkedAsCommunityMember = Boolean(
        team.communityId && communityMembership,
      );

      if (!isMember && !canOpenLinkedAsCommunityMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot open this Team",
        });
      }

      const memberRows = await ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, team.id),
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

      const memberNames = memberRows.map((row) => row.user.name);
      const incomplete = memberRows.length < 2;

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
      };
    }),
});
