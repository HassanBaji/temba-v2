import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  matches,
  teamMembers,
  teams,
} from "@repo/db";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  assertMayCreateGameOnGroup,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  canViewGame,
  getRegistrationStatus,
  isGameOrganizer,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  userPassesJoinGate,
} from "~/server/games/access";
import {
  assignFriendlyMatchSlots,
  enqueueWaitlistTeam,
  enqueueWaitlistUser,
  leaveRegisteredSeat,
  leaveWaitlistEntry,
} from "~/server/games/waitlist";
import { gameListTime, isGameLive } from "~/server/home/upcoming-games";
import { resolveLookupUser } from "~/server/invites/resolve-lookup-user";
import { type db } from "~/server/db";

type DbClient = typeof db;

const registrationModeSchema = z.enum(["individual", "team_only"]);

async function requireGroup(database: DbClient, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
  return group;
}

async function userAlreadyOnGame(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  return Boolean(row);
}

async function userAlreadyWaitlisted(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

async function insertGamePlayersAndTeam(args: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  gameId: string;
  userIds: [string, string];
  teamId: string | null;
}) {
  const createdPlayers = [];
  for (const userId of args.userIds) {
    const [player] = await args.tx
      .insert(gamePlayers)
      .values({
        gameId: args.gameId,
        userId,
      })
      .returning();
    if (!player) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to register on this Game",
      });
    }
    createdPlayers.push(player);
  }

  const [gameTeam] = await args.tx
    .insert(gameTeams)
    .values({
      gameId: args.gameId,
      teamId: args.teamId,
    })
    .returning();
  if (!gameTeam) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to register on this Game",
    });
  }

  for (const player of createdPlayers) {
    await args.tx.insert(gameTeamPlayers).values({
      gameTeamId: gameTeam.id,
      gamePlayerId: player.id,
    });
  }

  return gameTeam;
}

export const gamesRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  /**
   * Public pickup Games (parent events). Soft-archived Community Club Group
   * Games are excluded; the Game `isPublic` row flag is not flipped.
   * Groupless public Games are included.
   */
  listPublicPickup: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.games.findMany({
      where: and(eq(games.isPublic, true), isNull(games.cancelledAt)),
      columns: {
        id: true,
        name: true,
        isPublic: true,
        groupId: true,
        windowStart: true,
        windowEnd: true,
        cancelledAt: true,
        createdAt: true,
        format: true,
        sport: true,
      },
      with: {
        group: {
          columns: {
            id: true,
            communityId: true,
            name: true,
          },
          with: {
            community: {
              columns: {
                archivedAt: true,
              },
            },
          },
        },
        matches: {
          columns: {
            startTime: true,
            status: true,
          },
        },
      },
    });

    const now = new Date();

    return rows
      .filter(
        (row) =>
          row.cancelledAt == null && row.group?.community?.archivedAt == null,
      )
      .map((row) => {
        const candidate = {
          id: row.id,
          groupId: row.groupId,
          cancelledAt: row.cancelledAt,
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
          createdAt: row.createdAt,
          format: row.format,
          matches: row.matches,
        };
        return {
          id: row.id,
          name: row.name,
          isPublic: row.isPublic,
          groupId: row.groupId,
          groupName: row.group?.name ?? null,
          startTime: gameListTime(candidate),
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
          sport: row.sport,
          format: row.format,
          createdAt: row.createdAt,
          live: isGameLive(candidate, now),
        };
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }),

  create: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().max(255).optional(),
          groupId: z.string().uuid().optional(),
          isPublic: z.boolean(),
          registrationMode: registrationModeSchema,
          windowStart: z.coerce.date().optional(),
          windowEnd: z.coerce.date().optional(),
        })
        .refine(
          (value) => Boolean(value.windowStart) === Boolean(value.windowEnd),
          { message: "Window start and end must be set together" },
        )
        .refine(
          (value) =>
            !value.windowStart ||
            !value.windowEnd ||
            value.windowEnd.getTime() >= value.windowStart.getTime(),
          { message: "Window end must be at or after window start" },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      if (input.groupId) {
        const group = await requireGroup(ctx.db, input.groupId);
        await assertMayCreateGameOnGroup(ctx.db, group, appUser.id);
      }

      const windowStart = input.windowStart ?? null;
      const windowEnd = input.windowEnd ?? null;
      const durationInMinutes =
        windowStart && windowEnd
          ? Math.max(
              0,
              Math.round((windowEnd.getTime() - windowStart.getTime()) / 60000),
            )
          : null;

      const created = await ctx.db.transaction(async (tx) => {
        const [game] = await tx
          .insert(games)
          .values({
            name: input.name && input.name.length > 0 ? input.name : null,
            format: GameFormatEnum.FRIENDLY_GAME,
            registrationMode:
              input.registrationMode === "team_only"
                ? GameRegistrationModeEnum.TEAM_ONLY
                : GameRegistrationModeEnum.INDIVIDUAL,
            groupId: input.groupId ?? null,
            isPublic: input.isPublic,
            windowStart,
            windowEnd,
            playersAllowed: FRIENDLY_PLAYERS_ALLOWED,
            teamsAllowed: FRIENDLY_TEAMS_ALLOWED,
            sport: GameSportEnum.PADEL,
            createdBy: appUser.id,
          })
          .returning();

        if (!game) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Game",
          });
        }

        const [match] = await tx
          .insert(matches)
          .values({
            gameId: game.id,
            startTime: windowStart,
            endTime: windowEnd,
            durationInMinutes,
          })
          .returning();

        if (!match) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Match",
          });
        }

        return { game, match };
      });

      return {
        id: created.game.id,
        matchId: created.match.id,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const game = await requireGame(ctx.db, input.id);

      if (!(await canViewGame(ctx.db, game, appUser.id))) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      const now = new Date();
      const organizer = await isGameOrganizer(ctx.db, game, appUser.id);
      const passesGate = await userPassesJoinGate(ctx.db, game, appUser.id);
      const alreadyOnGame = await userAlreadyOnGame(
        ctx.db,
        game.id,
        appUser.id,
      );
      const userCount = await registeredUserCount(ctx.db, game.id);
      const teamCount = await registeredGameTeamCount(ctx.db, game.id);
      const registrationStatus = await getRegistrationStatus(ctx.db, game, now);
      const waitlistRows = await ctx.db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, game.id),
        with: {
          user: { columns: { id: true, name: true } },
          team: { columns: { id: true, name: true } },
        },
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      });

      const matchRows = await ctx.db.query.matches.findMany({
        where: eq(matches.gameId, game.id),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      const teamRows = await ctx.db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, game.id),
        with: {
          team: {
            columns: { id: true, name: true },
          },
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      const playerRows = await ctx.db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
        with: {
          user: {
            columns: { id: true, name: true },
          },
        },
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      });

      const group = game.groupId
        ? await ctx.db.query.groups.findFirst({
            where: eq(groups.id, game.groupId),
            columns: { id: true, name: true },
          })
        : null;

      const memberships = await ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, appUser.id),
        columns: { teamId: true },
      });
      const myTeamIds = memberships.map((row) => row.teamId);
      const isWaitlisted = waitlistRows.some(
        (row) =>
          row.userId === appUser.id ||
          (row.teamId !== null && myTeamIds.includes(row.teamId)),
      );
      const eligibleTeams = [];
      if (game.registrationMode === "team_only" && myTeamIds.length > 0) {
        const memberRows = await ctx.db.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, myTeamIds),
          with: {
            team: { columns: { id: true, name: true } },
            user: { columns: { id: true, name: true } },
          },
        });
        const byTeam = new Map<string, typeof memberRows>();
        for (const row of memberRows) {
          const list = byTeam.get(row.teamId) ?? [];
          list.push(row);
          byTeam.set(row.teamId, list);
        }
        for (const [teamId, members] of byTeam) {
          if (members.length !== 2) {
            continue;
          }
          const partnerIds = members.map((member) => member.userId);
          const bothAllowed = (
            await Promise.all(
              partnerIds.map((userId) =>
                userPassesJoinGate(ctx.db, game, userId),
              ),
            )
          ).every(Boolean);
          if (!bothAllowed) {
            continue;
          }
          const already = teamRows.some((row) => row.teamId === teamId);
          if (already) {
            continue;
          }
          const names = members.map((member) => member.user.name);
          eligibleTeams.push({
            id: teamId,
            name: members[0]?.team.name ?? names.join(" / "),
            memberNames: names,
          });
        }
      }

      return {
        id: game.id,
        name: game.name,
        format: game.format,
        registrationMode: game.registrationMode,
        isPublic: game.isPublic,
        groupId: game.groupId,
        groupName: group?.name ?? null,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        playersAllowed: game.playersAllowed,
        teamsAllowed: game.teamsAllowed,
        sport: game.sport,
        cancelledAt: game.cancelledAt,
        createdBy: game.createdBy,
        createdAt: game.createdAt,
        isOrganizer: organizer,
        isRegistered: alreadyOnGame,
        isWaitlisted,
        registrationStatus,
        canRegister:
          registrationStatus === "open" &&
          passesGate &&
          !alreadyOnGame &&
          !isWaitlisted,
        canWaitlist:
          registrationStatus === "full" &&
          passesGate &&
          !alreadyOnGame &&
          !isWaitlisted,
        canLeave: alreadyOnGame || isWaitlisted,
        registeredUserCount: userCount,
        registeredTeamCount: teamCount,
        waitlist: waitlistRows.map((row) => ({
          id: row.id,
          userId: row.userId,
          teamId: row.teamId,
          createdAt: row.createdAt,
          name: row.user?.name ?? row.team?.name ?? "Waitlisted",
        })),
        matches: matchRows.map((match) => ({
          id: match.id,
          startTime: match.startTime,
          endTime: match.endTime,
          durationInMinutes: match.durationInMinutes,
          status: match.status,
          courtId: match.courtId,
          slot1GameTeamId: match.slot1GameTeamId,
          slot2GameTeamId: match.slot2GameTeamId,
        })),
        gameTeams: teamRows.map((row) => ({
          id: row.id,
          teamId: row.teamId,
          name: row.name,
          members: row.players.flatMap((link) =>
            link.gamePlayer.user
              ? [
                  {
                    id: link.gamePlayer.user.id,
                    name: link.gamePlayer.user.name,
                  },
                ]
              : [],
          ),
        })),
        registeredPlayers: playerRows.flatMap((row) =>
          row.user
            ? [
                {
                  id: row.user.id,
                  name: row.user.name,
                },
              ]
            : [],
        ),
        eligibleTeams,
      };
    }),

  registerWithPartner: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        partnerQuery: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (game.format !== "friendly_game") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Register with a partner on a Friendly game",
        });
      }
      if (game.registrationMode !== "individual") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Game is team-only; register a complete Team",
        });
      }

      await assertRegistrationOpen(ctx.db, game, now);
      await assertUserPassesJoinGate(ctx.db, game, appUser.id);

      const partner = await resolveLookupUser(ctx.db, input.partnerQuery);
      if (partner.id === appUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot register with yourself",
        });
      }
      await assertUserPassesJoinGate(ctx.db, game, partner.id);

      if (await userAlreadyOnGame(ctx.db, game.id, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already registered on this Game",
        });
      }
      if (await userAlreadyOnGame(ctx.db, game.id, partner.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That User is already registered on this Game",
        });
      }
      if (await userAlreadyWaitlisted(ctx.db, game.id, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already on the waitlist",
        });
      }
      if (await userAlreadyWaitlisted(ctx.db, game.id, partner.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That User is already on the waitlist",
        });
      }

      const userCount = await registeredUserCount(ctx.db, game.id);
      const teamCount = await registeredGameTeamCount(ctx.db, game.id);
      const atCap =
        userCount + 2 > (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED) ||
        teamCount >= FRIENDLY_TEAMS_ALLOWED;

      if (atCap) {
        await ctx.db.transaction(async (tx) => {
          await enqueueWaitlistUser(tx, game.id, appUser.id);
          await enqueueWaitlistUser(tx, game.id, partner.id);
        });
        return { ok: true as const, waitlisted: true as const };
      }

      await ctx.db.transaction(async (tx) => {
        await insertGamePlayersAndTeam({
          tx,
          gameId: game.id,
          userIds: [appUser.id, partner.id],
          teamId: null,
        });
        await assignFriendlyMatchSlots(tx, game.id);
      });

      return { ok: true as const, waitlisted: false as const };
    }),

  registerTeam: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        teamId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (game.format !== "friendly_game") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Register a Team on a Friendly game",
        });
      }
      if (game.registrationMode !== "team_only") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Game is individual; register with a partner",
        });
      }

      await assertRegistrationOpen(ctx.db, game, now);

      const team = await ctx.db.query.teams.findFirst({
        where: eq(teams.id, input.teamId),
      });
      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      const members = await ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, team.id),
      });
      if (members.length !== 2) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Incomplete Teams cannot register",
        });
      }
      if (!members.some((member) => member.userId === appUser.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a member of that Team",
        });
      }

      for (const member of members) {
        await assertUserPassesJoinGate(ctx.db, game, member.userId);
      }

      const existing = await ctx.db.query.gameTeams.findFirst({
        where: and(
          eq(gameTeams.gameId, game.id),
          eq(gameTeams.teamId, team.id),
        ),
        columns: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That Team is already registered on this Game",
        });
      }

      const alreadyWaitlistedTeam = await ctx.db.query.gameWaitlist.findFirst({
        where: and(
          eq(gameWaitlist.gameId, game.id),
          eq(gameWaitlist.teamId, team.id),
        ),
        columns: { id: true },
      });
      if (alreadyWaitlistedTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That Team is already on the waitlist",
        });
      }

      for (const member of members) {
        if (await userAlreadyOnGame(ctx.db, game.id, member.userId)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A Team partner is already registered on this Game",
          });
        }
      }

      const teamCount = await registeredGameTeamCount(ctx.db, game.id);
      if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
        await enqueueWaitlistTeam(ctx.db, game.id, team.id);
        return { ok: true as const, waitlisted: true as const };
      }

      const userIds = members.map((member) => member.userId) as [
        string,
        string,
      ];

      await ctx.db.transaction(async (tx) => {
        await insertGamePlayersAndTeam({
          tx,
          gameId: game.id,
          userIds,
          teamId: team.id,
        });
        await assignFriendlyMatchSlots(tx, game.id);
      });

      return { ok: true as const, waitlisted: false as const };
    }),

  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const game = await requireGame(ctx.db, input.gameId);
      await ctx.db.transaction(async (tx) => {
        await leaveRegisteredSeat(tx, game, appUser.id);
      });
      return { ok: true as const };
    }),

  leaveWaitlist: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      await requireGame(ctx.db, input.gameId);
      await leaveWaitlistEntry(ctx.db, input.gameId, appUser.id);
      return { ok: true as const };
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
