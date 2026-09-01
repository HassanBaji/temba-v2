import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { gameInviteLinks, gameMemberInvites, user } from "@repo/db";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  assertGameOrganizer,
  getRegistrationStatus,
  isGameOrganizer,
  requireGame,
} from "~/server/games/access";
import { createGame } from "~/server/games/create";
import { gameById } from "~/server/games/by-id";
import { gameHideRegisteredWaitlistedSelf } from "~/server/games/helpers/game-hide-registered-waitlisted-self";
import { searchUsersForGamePicker } from "~/server/games/helpers/search-users-for-game-picker";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import { kick } from "~/server/games/kick";
import { leaveGame } from "~/server/games/leave";
import { leaveWaitlist } from "~/server/games/leave-waitlist";
import { listCreateVenues } from "~/server/games/list-create-venues";
import { moveSeat } from "~/server/games/move-seat";
import { register } from "~/server/games/register";
import { registerSeat } from "~/server/games/register-seat";
import { registerTeam } from "~/server/games/register-team";
import { registerWithPartner } from "~/server/games/register-with-partner";
import { searchPartnerUsers } from "~/server/games/search-partner-users";
import {
  addTournamentMatch,
  cancelGame,
  cancelMatch,
  closeRegistration,
  reopenRegistration,
  updateGameCaps,
  updateGameMatch,
  updateGamePricePerPlayer,
  updateGameWindow,
} from "~/server/games/organize";
import { listAssignableCourts } from "~/server/games/courts";
import {
  addMatchSet,
  completeMatch as markMatchCompleted,
  removeMatchSet,
  requireMatchOnGame,
  scoreMatchSet,
} from "~/server/games/sets";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "~/server/games/seats";
import { listMyGamesHubRows } from "~/server/games/list-my-games";
import { listPublicHubRows } from "~/server/games/list-public-pickup";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { gameInviteLinkUrl, getAppOrigin } from "~/server/invites/tokens";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "~/server/games/invites";
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";
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

export const gamesRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  /**
   * Games hub My Games: live upcoming Games on Groups the signed-in User
   * belongs to (including Soft-archived Club Group Games), plus private
   * Games they created or are registered/waitlisted on.
   */
  listMyGames: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMyGamesHubRows(ctx.db, appUser.id);
  }),

  /**
   * Public pickup Games (parent events). Live `isPublic` Games only.
   * Soft-archived Community Club Group Games are excluded; the Game
   * `isPublic` row flag is not flipped. Groupless public Games are included.
   * Games already listed on My Games are excluded (My Games preferred).
   */
  listPublicPickup: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listPublicHubRows(ctx.db, appUser.id);
  }),

  listCreateVenues: protectedProcedure
    .input(z.object({ groupId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listCreateVenues(ctx.db, {
        userId: appUser.id,
        groupId: input.groupId,
      });
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
          pricePerPlayerCents: z
            .number()
            .int()
            .min(0)
            .max(PRICE_PER_PLAYER_MAX_CENTS)
            .nullable()
            .optional(),
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
      return createGame(ctx.db, {
        ...input,
        createdBy: appUser.id,
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return gameById(ctx.db, { gameId: input.id, userId: appUser.id });
    }),

  register: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return register(ctx.db, { gameId: input.gameId, userId: appUser.id });
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
      return registerSeat(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        sideIndex: input.sideIndex,
        position: input.position,
      });
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
      return moveSeat(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        sideIndex: input.sideIndex,
        position: input.position,
      });
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
      return searchPartnerUsers(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        query: input.query,
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
      return registerWithPartner(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        partnerUserId: input.partnerUserId,
        sideIndex: input.sideIndex,
        position: input.position,
      });
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
      return registerTeam(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        teamId: input.teamId,
      });
    }),

  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return leaveGame(ctx.db, { gameId: input.gameId, userId: appUser.id });
    }),

  leaveWaitlist: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return leaveWaitlist(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
      });
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
      return kick(ctx.db, {
        gameId: input.gameId,
        organizerUserId: appUser.id,
        userId: input.userId,
        waitlistId: input.waitlistId,
      });
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

  updatePricePerPlayer: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        pricePerPlayerCents: z
          .number()
          .int()
          .min(0)
          .max(PRICE_PER_PLAYER_MAX_CENTS)
          .nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const game = await requireGame(ctx.db, input.gameId);
      await assertGameOrganizer(ctx.db, game, appUser.id);
      await ctx.db.transaction(async (tx) => {
        await updateGamePricePerPlayer(tx, game, input.pricePerPlayerCents);
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
