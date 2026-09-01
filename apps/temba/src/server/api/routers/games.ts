import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  gameInviteLinks,
  gameMemberInvites,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  groupMembers,
  matches,
  teamMembers,
  teams,
  user,
  venues,
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
  assertGameOrganizer,
  assertMayCreateGameOnGroup,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  canViewGame,
  getRegistrationStatus,
  isClubGroupGameJoinFrozen,
  isGameOrganizer,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  userPassesJoinGate,
  type GameRow,
} from "~/server/games/access";
import {
  addTournamentMatch,
  cancelGame,
  cancelMatch,
  closeRegistration,
  kickRegisteredUser,
  kickWaitlistEntry,
  reopenRegistration,
  updateGameCaps,
  updateGameMatch,
  updateGameWindow,
} from "~/server/games/organize";
import { listAssignableCourts } from "~/server/games/courts";
import { createFriendlyGame } from "~/server/games/create-friendly";
import {
  assertGameCreateVenueAndCourt,
  listVenuesForGameCreate,
} from "~/server/games/venue";
import {
  addMatchSet,
  bothSlotsFilled,
  bothSlottedTeamsComplete,
  completeMatch as markMatchCompleted,
  matchOutcome,
  removeMatchSet,
  requireMatchOnGame,
  scoreMatchSet,
  setWinsForGames,
} from "~/server/games/sets";
import { admit, type AdmitResult } from "~/server/games/admit";
import {
  enqueueWaitlistTeam,
  enqueueWaitlistUser,
  leaveRegisteredSeat,
  leaveWaitlistEntry,
} from "~/server/games/waitlist";
import {
  assertFullyVacantSide,
  firstFullyVacantSideIndex,
  isIndividualSeatGame,
  listGameSides,
  moveToSeat,
  occupySeat,
  remainingCapacity,
  sitsOnCompletedMatch,
  vacantPositionsFromSides,
} from "~/server/games/seats";
import {
  listMyGroupsHubRows,
  listPublicHubRows,
} from "~/server/games/hub-list-rows";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { searchLookupUsers } from "~/server/invites/search-lookup-users";
import { gameInviteLinkUrl, getAppOrigin } from "~/server/invites/tokens";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "~/server/games/invites";
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
import { type db } from "~/server/db";

type DbClient = typeof db;

const registrationModeSchema = z.enum(["individual", "team_only"]);
const createFormatSchema = z.enum([
  "friendly_game",
  "americano",
  "friendly_tournament",
]);

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
  if (row) {
    return true;
  }

  const teamRows = await database.query.gameWaitlist.findMany({
    where: and(eq(gameWaitlist.gameId, gameId), isNull(gameWaitlist.userId)),
    columns: { teamId: true },
  });
  const teamIds = teamRows
    .map((entry) => entry.teamId)
    .filter((teamId): teamId is string => Boolean(teamId));
  if (teamIds.length === 0) {
    return false;
  }

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.userId, userId),
      inArray(teamMembers.teamId, teamIds),
    ),
    columns: { id: true },
  });
  return Boolean(membership);
}

async function gameHideRegisteredWaitlistedSelf(
  database: DbClient,
  gameId: string,
  selfId: string,
) {
  const players = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { userId: true },
  });
  const waitlist = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, gameId),
    columns: { userId: true, teamId: true },
  });
  const waitlistTeamIds = waitlist
    .map((row) => row.teamId)
    .filter((teamId): teamId is string => Boolean(teamId));
  const waitlistTeamMembers =
    waitlistTeamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, waitlistTeamIds),
          columns: { userId: true },
        });

  return [
    selfId,
    ...players.map((row) => row.userId),
    ...waitlist
      .map((row) => row.userId)
      .filter((userId): userId is string => Boolean(userId)),
    ...waitlistTeamMembers.map((row) => row.userId),
  ].filter((userId): userId is string => Boolean(userId));
}

async function gameLookupHideUserIds(
  database: DbClient,
  gameId: string,
  selfId: string,
) {
  const unusedInvites = await database.query.gameMemberInvites.findMany({
    where: and(
      eq(gameMemberInvites.gameId, gameId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    columns: { userId: true },
  });

  return [
    ...(await gameHideRegisteredWaitlistedSelf(database, gameId, selfId)),
    ...unusedInvites.map((row) => row.userId),
  ];
}

async function searchUsersForGamePicker(
  database: DbClient,
  game: { groupId: string | null; isPublic: boolean },
  args: { query: string; excludeUserIds: string[] },
) {
  if (game.groupId && !game.isPublic) {
    const members = await database.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, game.groupId),
      columns: { userId: true },
    });
    return searchLookupUsers(database, {
      query: args.query,
      excludeUserIds: args.excludeUserIds,
      includeUserIds: members.map((row) => row.userId),
    });
  }

  if (game.groupId && game.isPublic) {
    const members = await database.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, game.groupId),
      columns: { userId: true },
    });
    return searchLookupUsers(database, {
      query: args.query,
      excludeUserIds: args.excludeUserIds,
      boostUserIds: members.map((row) => row.userId),
      boostCue: "Group member",
    });
  }

  return searchLookupUsers(database, {
    query: args.query,
    excludeUserIds: args.excludeUserIds,
  });
}

async function assertCanRegisterWithPartner(
  database: DbClient,
  game: GameRow,
  userId: string,
  now: Date,
) {
  if (
    game.format !== "friendly_game" &&
    game.format !== "friendly_tournament"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Register with a partner on a Friendly game or tournament",
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is team-only; register a complete Team",
    });
  }

  await assertRegistrationOpen(database, game, now);
  await assertUserPassesJoinGate(database, game, userId);

  if (await userAlreadyOnGame(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }
}

function throwIfAdmitRefused(result: AdmitResult) {
  if (result.ok || result.reason === "full") {
    return;
  }
  if (
    result.reason === "registration_closed" ||
    result.reason === "join_frozen"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
  if (result.reason === "team_already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Team is already registered on this Game",
    });
  }
  if (result.reason === "already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (result.reason === "seat_required") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a vacant Position",
    });
  }
  if (result.reason === "no_vacant_side") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No fully vacant side; pick a seat",
    });
  }
  if (result.reason === "team_not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Incomplete Teams cannot register",
  });
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
   * Games hub My Groups: live upcoming Games on Groups the signed-in User
   * belongs to (same membership / live filter as Home upcoming, including
   * Soft-archived Club Group Games).
   */
  listMyGroups: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMyGroupsHubRows(ctx.db, appUser.id);
  }),

  /**
   * Public pickup Games (parent events). Live `isPublic` Games only.
   * Soft-archived Community Club Group Games are excluded; the Game
   * `isPublic` row flag is not flipped. Groupless public Games are included.
   * Games already listed on My Groups are excluded (My preferred).
   */
  listPublicPickup: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listPublicHubRows(ctx.db, appUser.id);
  }),

  listCreateVenues: protectedProcedure
    .input(z.object({ groupId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      if (input.groupId) {
        const group = await requireGroup(ctx.db, input.groupId);
        await assertMayCreateGameOnGroup(ctx.db, group, appUser.id);
      }
      return listVenuesForGameCreate(ctx.db, input.groupId);
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().max(255).optional(),
          groupId: z.string().uuid().optional(),
          isPublic: z.boolean(),
          format: createFormatSchema.default("friendly_game"),
          registrationMode: registrationModeSchema,
          playersAllowed: z.number().int().optional(),
          teamsAllowed: z.number().int().optional(),
          windowStart: z.coerce.date(),
          windowEnd: z.coerce.date(),
          venueId: z.string().uuid({ message: "Pick a Venue" }),
          courtId: z.string().uuid().nullable().optional(),
          courtIds: z.array(z.string().uuid()).optional(),
        })
        .refine(
          (value) => value.windowEnd.getTime() >= value.windowStart.getTime(),
          {
            message: "Finish time must be at or after start time",
            path: ["windowEnd"],
          },
        )
        .refine(
          (value) =>
            value.format !== "americano" ||
            value.registrationMode === "individual",
          { message: "Americano is individual-only" },
        )
        .refine(
          (value) => {
            if (value.format !== "americano") {
              return true;
            }
            const cap = value.playersAllowed;
            return cap != null && cap >= 4 && cap % 4 === 0;
          },
          {
            message:
              "Americano players allowed must be a multiple of 4, minimum 4",
          },
        )
        .refine(
          (value) => {
            if (value.format !== "friendly_tournament") {
              return true;
            }
            if (value.registrationMode === "team_only") {
              return (value.teamsAllowed ?? 0) >= 2;
            }
            const cap = value.playersAllowed;
            return cap != null && cap >= 4 && cap % 4 === 0;
          },
          {
            message:
              "Tournament cap must be players allowed ×4 (min 4) or teams allowed ≥ 2",
          },
        )
        .superRefine((value, ctx) => {
          if (
            value.format === "friendly_game" &&
            value.courtIds !== undefined
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Friendly game does not accept courtIds",
              path: ["courtIds"],
            });
          }
          if (value.format !== "friendly_game" && value.courtId !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "courtId is only for Friendly game",
              path: ["courtId"],
            });
          }
          if (
            value.courtIds != null &&
            new Set(value.courtIds).size !== value.courtIds.length
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Duplicate courtIds",
              path: ["courtIds"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);

      if (input.groupId) {
        const group = await requireGroup(ctx.db, input.groupId);
        await assertMayCreateGameOnGroup(ctx.db, group, appUser.id);
      }

      const isAmericano = input.format === "americano";
      const isTournament = input.format === "friendly_tournament";

      if (!isAmericano && !isTournament) {
        const created = await createFriendlyGame(ctx.db, {
          createdBy: appUser.id,
          name: input.name,
          groupId: input.groupId,
          venueId: input.venueId,
          courtId: input.courtId,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
        });
        return {
          id: created.game.id,
          matchId: created.matchId,
        };
      }

      await assertGameCreateVenueAndCourt(ctx.db, {
        groupId: input.groupId,
        venueId: input.venueId,
        courtId: input.courtId,
        courtIds: input.courtIds,
      });

      const windowStart = input.windowStart;
      const windowEnd = input.windowEnd;
      const formatEnum = isAmericano
        ? GameFormatEnum.AMERICANO
        : GameFormatEnum.FRIENDLY_TOURNAMENT;
      const registrationMode = GameRegistrationModeEnum.INDIVIDUAL;
      const playersAllowed = input.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED;

      const created = await ctx.db.transaction(async (tx) => {
        const [game] = await tx
          .insert(games)
          .values({
            name: input.name && input.name.length > 0 ? input.name : null,
            format: formatEnum,
            registrationMode,
            groupId: input.groupId ?? null,
            venueId: input.venueId,
            isPublic: false,
            windowStart,
            windowEnd,
            playersAllowed,
            teamsAllowed: null,
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

        if (input.courtIds && input.courtIds.length > 0) {
          await tx.insert(gameCourts).values(
            input.courtIds.map((courtId) => ({
              gameId: game.id,
              courtId,
            })),
          );
        }
        return { game, matchId: null as string | null };
      });

      return {
        id: created.game.id,
        matchId: created.matchId,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
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
        with: {
          court: {
            columns: { id: true, name: true },
          },
          sets: {
            orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
          },
        },
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

      const venue = await ctx.db.query.venues.findFirst({
        where: eq(venues.id, game.venueId),
        columns: {
          id: true,
          name: true,
          city: true,
          country: true,
          archivedAt: true,
        },
      });

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

      const myGameTeamIds = new Set(
        teamRows
          .filter((row) =>
            row.players.some((link) => link.gamePlayer.user?.id === appUser.id),
          )
          .map((row) => row.id),
      );

      const seatedUserIds = new Set(
        teamRows.flatMap((row) =>
          row.players.flatMap((link) =>
            link.gamePlayer.user?.id ? [link.gamePlayer.user.id] : [],
          ),
        ),
      );
      const isSeated = seatedUserIds.has(appUser.id);
      const unseatedPlayers = playerRows.flatMap((row) =>
        row.user && !seatedUserIds.has(row.user.id)
          ? [{ id: row.user.id, name: row.user.name }]
          : [],
      );
      const sides = isIndividualSeatGame(game)
        ? await listGameSides(ctx.db, game)
        : [];
      const canPickSeat =
        alreadyOnGame &&
        !isSeated &&
        registrationStatus !== "cancelled" &&
        registrationStatus !== "closed";
      const hasVacantPosition = sides.some(
        (side) => side.left == null || side.right == null,
      );
      let sitsCompleted = false;
      if (isSeated) {
        for (const teamId of myGameTeamIds) {
          if (await sitsOnCompletedMatch(ctx.db, game.id, teamId)) {
            sitsCompleted = true;
            break;
          }
        }
      }
      const canMove =
        isSeated &&
        registrationStatus === "open" &&
        hasVacantPosition &&
        !sitsCompleted;

      return {
        id: game.id,
        name: game.name,
        format: game.format,
        registrationMode: game.registrationMode,
        isPublic: game.isPublic,
        groupId: game.groupId,
        groupName: group?.name ?? null,
        venueId: game.venueId,
        venue: venue
          ? {
              name: venue.name,
              city: venue.city,
              country: venue.country,
              archivedAt: venue.archivedAt,
            }
          : null,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        playersAllowed: game.playersAllowed,
        teamsAllowed: game.teamsAllowed,
        sport: game.sport,
        cancelledAt: game.cancelledAt,
        registrationClosedAt: game.registrationClosedAt,
        createdBy: game.createdBy,
        createdAt: game.createdAt,
        isOrganizer: organizer,
        joinFrozen: await isClubGroupGameJoinFrozen(ctx.db, game),
        isRegistered: alreadyOnGame,
        isSeated,
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
        canPickSeat,
        canMove,
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
        matches: await Promise.all(
          matchRows.map(async (match) => {
            const onSides =
              Boolean(match.slot1GameTeamId) &&
              Boolean(match.slot2GameTeamId) &&
              (myGameTeamIds.has(match.slot1GameTeamId ?? "") ||
                myGameTeamIds.has(match.slot2GameTeamId ?? ""));
            const frozen =
              match.status === "completed" || match.status === "cancelled";
            const canWriteSets =
              !frozen && game.format !== "americano" && (organizer || onSides);
            const sidesComplete = await bothSlottedTeamsComplete(ctx.db, match);
            const outcome = matchOutcome(match.sets);
            return {
              id: match.id,
              startTime: match.startTime,
              endTime: match.endTime,
              durationInMinutes: match.durationInMinutes,
              status: match.status,
              courtId: match.courtId,
              courtName: match.court?.name ?? null,
              slot1GameTeamId: match.slot1GameTeamId,
              slot2GameTeamId: match.slot2GameTeamId,
              bothSlotsFilled: bothSlotsFilled(match),
              bothSidesComplete: sidesComplete,
              canAddSet: canWriteSets && (organizer || onSides),
              canScoreSets:
                canWriteSets && sidesComplete && (organizer || onSides),
              canComplete:
                !frozen &&
                game.format !== "americano" &&
                (organizer || onSides) &&
                sidesComplete &&
                match.sets.length > 0 &&
                outcome.result !== "none",
              outcome,
              sets: match.sets.map((set) => ({
                id: set.id,
                slot1GamesWon: set.slot1GamesWon,
                slot2GamesWon: set.slot2GamesWon,
                wins: setWinsForGames(set.slot1GamesWon, set.slot2GamesWon),
              })),
            };
          }),
        ),
        gameTeams: teamRows.map((row) => ({
          id: row.id,
          teamId: row.teamId,
          name: row.name,
          sideIndex: row.sideIndex,
          members: row.players.flatMap((link) =>
            link.gamePlayer.user
              ? [
                  {
                    id: link.gamePlayer.user.id,
                    name: link.gamePlayer.user.name,
                    position: link.position,
                  },
                ]
              : [],
          ),
        })),
        sides,
        unseatedPlayers,
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

  register: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (game.format !== "americano") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Register as yourself on an Americano",
        });
      }
      if (game.registrationMode !== "individual") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Game is team-only",
        });
      }

      await assertUserPassesJoinGate(ctx.db, game, appUser.id);

      if (await userAlreadyOnGame(ctx.db, game.id, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already registered on this Game",
        });
      }
      if (await userAlreadyWaitlisted(ctx.db, game.id, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already on the waitlist",
        });
      }

      const admitted = await admit(ctx.db, {
        game,
        door: "register",
        party: { kind: "user", userId: appUser.id },
        now,
      });
      if (!admitted.ok) {
        if (admitted.reason === "full") {
          await enqueueWaitlistUser(ctx.db, game.id, appUser.id);
          return { ok: true as const, waitlisted: true as const };
        }
        throwIfAdmitRefused(admitted);
      }
      return { ok: true as const, waitlisted: false as const };
    }),

  registerSeat: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        sideIndex: z.number().int().min(1).optional(),
        position: z.enum(["left", "right"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (!isIndividualSeatGame(game)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a seat on an individual Friendly game or tournament",
        });
      }

      await assertUserPassesJoinGate(ctx.db, game, appUser.id);

      const existingPlayer = await ctx.db.query.gamePlayers.findFirst({
        where: and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.userId, appUser.id),
        ),
      });
      if (existingPlayer) {
        const seated = await ctx.db.query.gameTeamPlayers.findFirst({
          where: eq(gameTeamPlayers.gamePlayerId, existingPlayer.id),
          columns: { id: true },
        });
        if (seated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already registered on this Game",
          });
        }
        if (input.sideIndex == null || input.position == null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pick a vacant Position",
          });
        }
        const leftoverSideIndex = input.sideIndex;
        const leftoverPosition = input.position;
        await ctx.db.transaction(async (tx) => {
          await occupySeat(
            tx,
            game,
            appUser.id,
            leftoverSideIndex,
            leftoverPosition,
            existingPlayer.id,
          );
        });
        return { ok: true as const, waitlisted: false as const };
      }

      if (await userAlreadyWaitlisted(ctx.db, game.id, appUser.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already on the waitlist",
        });
      }

      if ((await remainingCapacity(ctx.db, game)) <= 0) {
        await enqueueWaitlistUser(ctx.db, game.id, appUser.id);
        return { ok: true as const, waitlisted: true as const };
      }

      if (input.sideIndex == null || input.position == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a vacant Position",
        });
      }
      const sideIndex = input.sideIndex;
      const position = input.position;

      await ctx.db.transaction(async (tx) => {
        throwIfAdmitRefused(
          await admit(tx, {
            game,
            door: "register",
            party: {
              kind: "user",
              userId: appUser.id,
              seat: { sideIndex, position },
            },
            now,
          }),
        );
      });
      return { ok: true as const, waitlisted: false as const };
    }),

  moveSeat: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        sideIndex: z.number().int().min(1),
        position: z.enum(["left", "right"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (!isIndividualSeatGame(game)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Move a seat on an individual Friendly game or tournament",
        });
      }

      await assertRegistrationOpen(ctx.db, game, now);
      const status = await getRegistrationStatus(ctx.db, game, now);
      if (status === "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No vacant Position",
        });
      }

      await ctx.db.transaction(async (tx) => {
        await moveToSeat(tx, game, appUser.id, input.sideIndex, input.position);
      });
      return { ok: true as const };
    }),

  searchPartnerUsers: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();
      await assertCanRegisterWithPartner(ctx.db, game, appUser.id, now);

      const excludeUserIds = await gameHideRegisteredWaitlistedSelf(
        ctx.db,
        game.id,
        appUser.id,
      );

      // Groupless non-public: only the organizer passes the join gate, and
      // the organizer is already excluded as self.
      if (!game.isPublic && !game.groupId) {
        return [];
      }

      return searchUsersForGamePicker(ctx.db, game, {
        query: input.query,
        excludeUserIds,
      });
    }),

  registerWithPartner: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        partnerUserId: z.string().uuid(),
        sideIndex: z.number().int().min(1).optional(),
        position: z.enum(["left", "right"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();
      await assertCanRegisterWithPartner(ctx.db, game, appUser.id, now);

      const partner = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.partnerUserId),
        columns: { id: true },
      });
      if (!partner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not found",
        });
      }
      if (partner.id === appUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot register with yourself",
        });
      }
      await assertUserPassesJoinGate(ctx.db, game, partner.id);

      if (await userAlreadyOnGame(ctx.db, game.id, partner.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That User is already registered on this Game",
        });
      }
      if (await userAlreadyWaitlisted(ctx.db, game.id, partner.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That User is already on the waitlist",
        });
      }

      const remaining = await remainingCapacity(ctx.db, game);

      if (remaining <= 0) {
        await ctx.db.transaction(async (tx) => {
          await enqueueWaitlistUser(tx, game.id, appUser.id);
          await enqueueWaitlistUser(tx, game.id, partner.id);
        });
        return { ok: true as const, waitlisted: true as const };
      }
      if (remaining < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough seats; pick a seat",
        });
      }

      const vacantSide = await firstFullyVacantSideIndex(ctx.db, game);
      if (vacantSide == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fully vacant side; pick a seat",
        });
      }
      if (input.sideIndex == null || input.position == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a vacant side and your Position",
        });
      }
      const sideIndex = input.sideIndex;
      const position = input.position;
      await assertFullyVacantSide(ctx.db, game, sideIndex);

      await ctx.db.transaction(async (tx) => {
        throwIfAdmitRefused(
          await admit(tx, {
            game,
            door: "register",
            party: {
              kind: "pair",
              userIds: [appUser.id, partner.id],
              sideIndex,
              callerPosition: position,
            },
            now,
          }),
        );
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
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const now = new Date();

      if (
        game.format !== "friendly_game" &&
        game.format !== "friendly_tournament"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Register a Team on a Friendly game or tournament",
        });
      }
      if (game.registrationMode !== "team_only") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Game is individual",
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

      await ctx.db.transaction(async (tx) => {
        throwIfAdmitRefused(
          await admit(tx, {
            game,
            door: "register",
            party: { kind: "team", teamId: team.id },
            now,
          }),
        );
      });

      return { ok: true as const, waitlisted: false as const };
    }),

  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await ctx.db.transaction(async (tx) => {
        await leaveRegisteredSeat(tx, game, appUser.id);
      });
      return { ok: true as const };
    }),

  leaveWaitlist: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      await requireGame(ctx.db, input.gameId);
      await leaveWaitlistEntry(ctx.db, input.gameId, appUser.id);
      return { ok: true as const };
    }),

  kick: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
          userId: z.string().uuid().optional(),
          waitlistId: z.string().uuid().optional(),
        })
        .refine(
          (value) => Boolean(value.userId) !== Boolean(value.waitlistId),
          { message: "Kick a registered User or a waitlist entry" },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      if (input.waitlistId) {
        await kickWaitlistEntry(ctx.db, game.id, input.waitlistId);
        return { ok: true as const };
      }
      if (!input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kick a registered User or a waitlist entry",
        });
      }
      const userId = input.userId;
      await ctx.db.transaction(async (tx) => {
        await kickRegisteredUser(tx, game, userId);
      });
      return { ok: true as const };
    }),

  closeRegistration: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await closeRegistration(ctx.db, game);
      return { ok: true as const };
    }),

  reopenRegistration: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await reopenRegistration(ctx.db, game);
      return { ok: true as const };
    }),

  cancel: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await ctx.db.transaction(async (tx) => {
        await cancelGame(tx, game);
      });
      return { ok: true as const };
    }),

  cancelMatch: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      const result = await ctx.db.transaction(async (tx) => {
        return cancelMatch(tx, game, input.matchId);
      });
      return result;
    }),

  updateWindow: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
          name: z.string().trim().min(1).max(255),
          windowStart: z.coerce.date(),
          windowEnd: z.coerce.date(),
        })
        .refine(
          (value) => value.windowEnd.getTime() >= value.windowStart.getTime(),
          {
            message: "Finish time must be at or after start time",
            path: ["windowEnd"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await ctx.db.transaction(async (tx) => {
        await updateGameWindow(
          tx,
          game,
          input.windowStart,
          input.windowEnd,
          input.name,
        );
      });
      return { ok: true as const };
    }),

  updateCaps: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
          playersAllowed: z.number().int().optional(),
          teamsAllowed: z.number().int().optional(),
        })
        .refine(
          (value) =>
            value.playersAllowed !== undefined ||
            value.teamsAllowed !== undefined,
          { message: "Set players allowed or teams allowed" },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await updateGameCaps(ctx.db, game, {
        playersAllowed: input.playersAllowed,
        teamsAllowed: input.teamsAllowed,
      });
      return { ok: true as const };
    }),

  listCourts: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      return listAssignableCourts(ctx.db, game);
    }),

  addMatch: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        startTime: z.coerce.date().nullable().optional(),
        endTime: z.coerce.date().nullable().optional(),
        durationInMinutes: z.number().int().nonnegative().nullable().optional(),
        courtId: z.string().uuid().nullable().optional(),
        slot1GameTeamId: z.string().uuid().nullable().optional(),
        slot2GameTeamId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      const match = await ctx.db.transaction(async (tx) => {
        return addTournamentMatch(tx, game, {
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          durationInMinutes: input.durationInMinutes ?? null,
          courtId: input.courtId ?? null,
          slot1GameTeamId: input.slot1GameTeamId ?? null,
          slot2GameTeamId: input.slot2GameTeamId ?? null,
        });
      });
      return match;
    }),

  updateMatch: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
        startTime: z.coerce.date().nullable().optional(),
        endTime: z.coerce.date().nullable().optional(),
        durationInMinutes: z.number().int().nonnegative().nullable().optional(),
        courtId: z.string().uuid().nullable().optional(),
        slot1GameTeamId: z.string().uuid().nullable().optional(),
        slot2GameTeamId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await ctx.db.transaction(async (tx) => {
        await updateGameMatch(tx, game, input.matchId, {
          startTime: input.startTime,
          endTime: input.endTime,
          durationInMinutes: input.durationInMinutes,
          courtId: input.courtId,
          slot1GameTeamId: input.slot1GameTeamId,
          slot2GameTeamId: input.slot2GameTeamId,
        });
      });
      return { ok: true as const };
    }),

  addSet: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const match = await requireMatchOnGame(ctx.db, game.id, input.matchId);
      const organizer = await isGameOrganizer(ctx.db, game, appUser.id);
      const created = await addMatchSet(
        ctx.db,
        game,
        match,
        appUser.id,
        organizer,
      );
      return { id: created.id };
    }),

  scoreSet: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
        setId: z.string().uuid(),
        slot1GamesWon: z.number().int().nonnegative(),
        slot2GamesWon: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const match = await requireMatchOnGame(ctx.db, game.id, input.matchId);
      const organizer = await isGameOrganizer(ctx.db, game, appUser.id);
      await scoreMatchSet(
        ctx.db,
        game,
        match,
        input.setId,
        appUser.id,
        organizer,
        {
          slot1GamesWon: input.slot1GamesWon,
          slot2GamesWon: input.slot2GamesWon,
        },
      );
      return { ok: true as const };
    }),

  removeSet: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
        setId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const match = await requireMatchOnGame(ctx.db, game.id, input.matchId);
      const organizer = await isGameOrganizer(ctx.db, game, appUser.id);
      await removeMatchSet(
        ctx.db,
        game,
        match,
        input.setId,
        appUser.id,
        organizer,
      );
      return { ok: true as const };
    }),

  completeMatch: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        matchId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      const match = await requireMatchOnGame(ctx.db, game.id, input.matchId);
      const organizer = await isGameOrganizer(ctx.db, game, appUser.id);
      await markMatchCompleted(ctx.db, game, match, appUser.id, organizer);
      return { ok: true as const };
    }),

  searchLookupUsers: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await assertGameInviteDoorsOpen(ctx.db, game);
      if (game.registrationMode === "team_only") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team-only Games do not use Lookup invites",
        });
      }

      const excludeUserIds = await gameLookupHideUserIds(
        ctx.db,
        game.id,
        appUser.id,
      );

      return searchUsersForGamePicker(ctx.db, game, {
        query: input.query,
        excludeUserIds,
      });
    }),

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await assertGameInviteDoorsOpen(ctx.db, game);
      if (game.registrationMode === "team_only") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team-only Games do not use Lookup invites",
        });
      }

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
        gameId: string;
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

        if (target.id === appUser.id) {
          refused.push({
            name: target.name,
            message: "You cannot Lookup-invite yourself",
          });
          continue;
        }

        try {
          await assertInviteeAllowedOnGame(ctx.db, game, target.id);
        } catch (error) {
          refused.push({
            name: target.name,
            message:
              error instanceof TRPCError
                ? error.message
                : "Only Group members can use invites on this Game",
          });
          continue;
        }

        if (await userAlreadyOnGame(ctx.db, game.id, target.id)) {
          refused.push({
            name: target.name,
            message: "That User is already registered on this Game",
          });
          continue;
        }

        if (await userAlreadyWaitlisted(ctx.db, game.id, target.id)) {
          refused.push({
            name: target.name,
            message: "That User is already on the waitlist",
          });
          continue;
        }

        const existing = await ctx.db.query.gameMemberInvites.findFirst({
          where: and(
            eq(gameMemberInvites.gameId, game.id),
            eq(gameMemberInvites.userId, target.id),
            isNull(gameMemberInvites.acceptedAt),
            isNull(gameMemberInvites.revokedAt),
          ),
        });
        if (existing) {
          refused.push({
            name: target.name,
            message: "An unused Lookup invite already exists for this User",
          });
          continue;
        }

        try {
          const minted = await mintLookup(
            ctx.db,
            { kind: "game", id: game.id },
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
            gameId: minted.invite.hostId,
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
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      return listLookup(ctx.db, { kind: "game", id: game.id });
    }),

  revokeLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const invite = await ctx.db.query.gameMemberInvites.findFirst({
        where: eq(gameMemberInvites.id, input.inviteId),
      });
      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite not found",
        });
      }
      const game = await requireGame(ctx.db, invite.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
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
        { kind: "game", id: game.id },
        invite.id,
      );
      if (!revoked.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Lookup invites cannot be revoked",
        });
      }
      return { ok: true as const };
    }),

  pendingLookupInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    const rows = await ctx.db.query.gameMemberInvites.findMany({
      where: and(
        eq(gameMemberInvites.userId, appUser.id),
        isNull(gameMemberInvites.acceptedAt),
        isNull(gameMemberInvites.revokedAt),
      ),
      with: {
        game: {
          columns: { id: true, name: true },
        },
        invitedBy: {
          columns: { id: true, name: true, email: true },
        },
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    const mapped = [];
    for (const row of rows) {
      const game = await requireGame(ctx.db, row.gameId);
      const needsSeatPick = isIndividualSeatGame(game);
      const sides = needsSeatPick ? await listGameSides(ctx.db, game) : [];
      mapped.push({
        id: row.id,
        gameId: row.gameId,
        gameName: row.game.name ?? "Untitled Game",
        invitedBy: {
          id: row.invitedBy.id,
          name: row.invitedBy.name,
          email: row.invitedBy.email,
        },
        createdAt: row.createdAt,
        needsSeatPick,
        format: game.format,
        registrationStatus: await getRegistrationStatus(
          ctx.db,
          game,
          new Date(),
        ),
        sides,
        vacantSeats: vacantPositionsFromSides(sides),
      });
    }
    return mapped;
  }),

  acceptLookupInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string().uuid(),
        sideIndex: z.number().int().min(1).optional(),
        position: z.enum(["left", "right"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const invite = await ctx.db.query.gameMemberInvites.findFirst({
        where: eq(gameMemberInvites.id, input.inviteId),
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
      const game = await requireGame(ctx.db, invite.gameId);
      await assertGameInviteDoorsOpen(ctx.db, game);
      await assertInviteeAllowedOnGame(ctx.db, game, appUser.id);

      const accepted = await acceptLookup(
        ctx.db,
        { kind: "game", id: game.id },
        {
          inviteId: invite.id,
          userId: appUser.id,
          seat:
            input.sideIndex != null && input.position
              ? { sideIndex: input.sideIndex, position: input.position }
              : undefined,
        },
      );
      if (!accepted.ok) {
        if (accepted.reason === "seat_required") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pick a vacant Position",
          });
        }
        if (accepted.reason === "frozen") {
          throwInviteFrozen({ kind: "game", id: game.id }, "accept", "frozen");
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite is not available",
        });
      }

      return {
        ok: true as const,
        gameId: game.id,
        waitlisted: accepted.waitlisted ?? false,
      };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      const newest = await ctx.db.query.gameInviteLinks.findFirst({
        where: and(
          eq(gameInviteLinks.gameId, game.id),
          gt(gameInviteLinks.expiresAt, new Date()),
        ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
      if (!newest) {
        return null;
      }
      return {
        id: newest.id,
        inviteUrl: gameInviteLinkUrl(getAppOrigin(ctx.headers), newest.token),
        createdAt: newest.createdAt,
        expiresAt: newest.expiresAt,
      };
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await assertGameInviteDoorsOpen(ctx.db, game);
      const minted = await mintLink(
        ctx.db,
        { kind: "game", id: game.id },
        { createdBy: appUser.id },
      );
      if (!minted.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Invite link",
        });
      }
      return {
        id: minted.link.id,
        inviteUrl: gameInviteLinkUrl(
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
      const previewed = await previewLink(ctx.db, "game", input.token);
      if (previewed.status !== "ready") {
        return { status: previewed.status };
      }
      const link = await ctx.db.query.gameInviteLinks.findFirst({
        where: eq(gameInviteLinks.token, input.token),
      });
      if (!link) {
        return { status: "invalid" as const };
      }
      const gameRow = await requireGame(ctx.db, link.gameId);
      const needsSeatPick = isIndividualSeatGame(gameRow);
      const sides = needsSeatPick ? await listGameSides(ctx.db, gameRow) : [];
      return {
        status: "ready" as const,
        gameName: previewed.name,
        format: gameRow.format,
        registrationStatus: await getRegistrationStatus(
          ctx.db,
          gameRow,
          new Date(),
        ),
        needsSeatPick,
        sides,
        vacantSeats: vacantPositionsFromSides(sides),
      };
    }),

  acceptInviteLink: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1).max(64),
        sideIndex: z.number().int().min(1).optional(),
        position: z.enum(["left", "right"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const link = await ctx.db.query.gameInviteLinks.findFirst({
        where: eq(gameInviteLinks.token, input.token),
      });
      if (!link || !isInviteLinkLive(link.expiresAt)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is invalid or expired",
        });
      }
      const game = await requireGame(ctx.db, link.gameId);
      await assertGameInviteDoorsOpen(ctx.db, game);
      await assertInviteeAllowedOnGame(ctx.db, game, appUser.id);

      if (await userAlreadyOnGame(ctx.db, game.id, appUser.id)) {
        return {
          gameId: game.id,
          outcome: "already" as const,
          waitlisted: false as const,
        };
      }

      const accepted = await acceptLink(ctx.db, "game", {
        token: input.token,
        userId: appUser.id,
        seat:
          input.sideIndex != null && input.position
            ? { sideIndex: input.sideIndex, position: input.position }
            : undefined,
      });
      if (!accepted.ok) {
        if (accepted.reason === "seat_required") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pick a vacant Position",
          });
        }
        if (accepted.reason === "frozen") {
          throwInviteFrozen({ kind: "game", id: game.id }, "accept", "frozen");
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is invalid or expired",
        });
      }
      if (accepted.waitingForPartner) {
        return {
          gameId: game.id,
          outcome: "waiting_for_partner" as const,
          waitlisted: false as const,
        };
      }
      return {
        gameId: game.id,
        outcome: accepted.waitlisted
          ? ("waitlisted" as const)
          : ("registered" as const),
        waitlisted: accepted.waitlisted ?? false,
      };
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
