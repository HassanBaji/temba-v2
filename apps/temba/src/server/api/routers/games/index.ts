import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { acceptInviteLink } from "~/server/games/accept-invite-link";
import { acceptLookupInvite } from "~/server/games/accept-lookup-invite";
import { addMatch } from "~/server/games/add-match";
import { addSet } from "~/server/games/add-set";
import { cancelGame } from "~/server/games/cancel";
import { cancelMatch } from "~/server/games/cancel-match";
import { closeRegistration } from "~/server/games/close-registration";
import { completeMatch } from "~/server/games/complete-match";
import { createInviteLink } from "~/server/games/create-invite-link";
import { getInviteLink } from "~/server/games/get-invite-link";
import {
  approveLevelRangeRequest,
  listLevelRangeRequests,
  rejectLevelRangeRequest,
  requestLevelRange,
} from "~/server/games/level-range-requests";
import { listCourts } from "~/server/games/list-courts";
import { listLookupInvites } from "~/server/games/list-lookup-invites";
import { pendingLookupInvites } from "~/server/games/pending-lookup-invites";
import { previewInviteLink } from "~/server/games/preview-invite-link";
import { removeSet } from "~/server/games/remove-set";
import { reopenRegistration } from "~/server/games/reopen-registration";
import { revokeLookupInvite } from "~/server/games/revoke-lookup-invite";
import { scoreSet } from "~/server/games/score-set";
import { searchLookupUsers } from "~/server/games/search-lookup-users";
import { sendLookupInvite } from "~/server/games/send-lookup-invite";
import { updateGameCaps } from "~/server/games/update-caps";
import { updateGameLevelRange } from "~/server/games/update-level-range";
import { updateMatch } from "~/server/games/update-match";
import { updateGamePricePerPlayer } from "~/server/games/update-price-per-player";
import { updateGameWindow } from "~/server/games/update-window";
import { getAppOrigin } from "~/server/invites/tokens";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "~/lib/level-range";
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";

import { byId } from "./byId";
import { create } from "./create";
import { getSecretMessage } from "./getSecretMessage";
import { hello } from "./hello";
import { kickProcedure as kick } from "./kick";
import { leave } from "./leave";
import { leaveWaitlistProcedure as leaveWaitlist } from "./leaveWaitlist";
import { listCreateVenues } from "./listCreateVenues";
import { listMyGames } from "./listMyGames";
import { listPublicPickup } from "./listPublicPickup";
import { moveSeatProcedure as moveSeat } from "./moveSeat";
import { registerProcedure as register } from "./register";
import { registerSeatProcedure as registerSeat } from "./registerSeat";
import { registerTeamProcedure as registerTeam } from "./registerTeam";
import { registerWithPartnerProcedure as registerWithPartner } from "./registerWithPartner";
import { searchPartnerUsersProcedure as searchPartnerUsers } from "./searchPartnerUsers";

export const gamesRouter = createTRPCRouter({
  hello,
  listMyGames,
  listPublicPickup,
  listCreateVenues,
  create,
  byId,
  register,
  registerSeat,
  moveSeat,
  searchPartnerUsers,
  registerWithPartner,
  registerTeam,
  leave,
  leaveWaitlist,
  kick,

  closeRegistration: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return closeRegistration(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
      });
    }),

  reopenRegistration: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return reopenRegistration(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
      });
    }),

  cancel: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return cancelGame(ctx.db, { gameId: input.gameId, userId: appUser.id });
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
      return cancelMatch(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        matchId: input.matchId,
      });
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
      return updateGameWindow(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        name: input.name,
      });
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
      return updateGamePricePerPlayer(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        pricePerPlayerCents: input.pricePerPlayerCents,
      });
    }),

  updateLevelRange: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
          levelMinTenths: z
            .number()
            .int()
            .min(LEVEL_TENTHS_MIN)
            .max(LEVEL_TENTHS_MAX)
            .nullable(),
          levelMaxTenths: z
            .number()
            .int()
            .min(LEVEL_TENTHS_MIN)
            .max(LEVEL_TENTHS_MAX)
            .nullable(),
        })
        .superRefine((value, ctx) => {
          if (
            value.levelMinTenths != null &&
            value.levelMaxTenths != null &&
            value.levelMinTenths > value.levelMaxTenths
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: LEVEL_RANGE_INVERTED_MESSAGE,
              path: ["levelMinTenths"],
            });
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: LEVEL_RANGE_INVERTED_MESSAGE,
              path: ["levelMaxTenths"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return updateGameLevelRange(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        levelMinTenths: input.levelMinTenths,
        levelMaxTenths: input.levelMaxTenths,
      });
    }),

  requestLevelRange: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        inviteToken: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return requestLevelRange(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        inviteToken: input.inviteToken,
      });
    }),

  listLevelRangeRequests: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listLevelRangeRequests(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
      });
    }),

  approveLevelRangeRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return approveLevelRangeRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  rejectLevelRangeRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return rejectLevelRangeRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
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
      return updateGameCaps(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        playersAllowed: input.playersAllowed,
        teamsAllowed: input.teamsAllowed,
      });
    }),

  listCourts: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listCourts(ctx.db, { gameId: input.gameId, userId: appUser.id });
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
      return addMatch(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        durationInMinutes: input.durationInMinutes ?? null,
        courtId: input.courtId ?? null,
        slot1GameTeamId: input.slot1GameTeamId ?? null,
        slot2GameTeamId: input.slot2GameTeamId ?? null,
      });
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
      return updateMatch(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        matchId: input.matchId,
        startTime: input.startTime,
        endTime: input.endTime,
        durationInMinutes: input.durationInMinutes,
        courtId: input.courtId,
        slot1GameTeamId: input.slot1GameTeamId,
        slot2GameTeamId: input.slot2GameTeamId,
      });
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
      return addSet(ctx.db, {
        gameId: input.gameId,
        matchId: input.matchId,
        userId: appUser.id,
      });
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
      return scoreSet(ctx.db, {
        gameId: input.gameId,
        matchId: input.matchId,
        setId: input.setId,
        userId: appUser.id,
        slot1GamesWon: input.slot1GamesWon,
        slot2GamesWon: input.slot2GamesWon,
      });
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
      return removeSet(ctx.db, {
        gameId: input.gameId,
        matchId: input.matchId,
        setId: input.setId,
        userId: appUser.id,
      });
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
      return completeMatch(ctx.db, {
        gameId: input.gameId,
        matchId: input.matchId,
        userId: appUser.id,
      });
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
      return searchLookupUsers(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        query: input.query,
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
      return sendLookupInvite(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        userIds: input.userIds,
      });
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listLookupInvites(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
      });
    }),

  revokeLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return revokeLookupInvite(ctx.db, {
        inviteId: input.inviteId,
        userId: appUser.id,
      });
    }),

  pendingLookupInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingLookupInvites(ctx.db, { userId: appUser.id });
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
      return acceptLookupInvite(ctx.db, {
        inviteId: input.inviteId,
        userId: appUser.id,
        sideIndex: input.sideIndex,
        position: input.position,
      });
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return getInviteLink(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        origin: getAppOrigin(ctx.headers),
      });
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createInviteLink(ctx.db, {
        gameId: input.gameId,
        userId: appUser.id,
        origin: getAppOrigin(ctx.headers),
      });
    }),

  previewInviteLink: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      let userId: string | undefined;
      if (ctx.userId) {
        const appUser = await resolveAppUser(ctx.userId);
        userId = appUser.id;
      }
      return previewInviteLink(ctx.db, { token: input.token, userId });
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
      return acceptInviteLink(ctx.db, {
        token: input.token,
        userId: appUser.id,
        sideIndex: input.sideIndex,
        position: input.position,
      });
    }),

  getSecretMessage,
});
