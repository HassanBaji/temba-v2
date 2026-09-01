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
import { gameById } from "~/server/games/by-id";
import { cancelGame } from "~/server/games/cancel";
import { cancelMatch } from "~/server/games/cancel-match";
import { closeRegistration } from "~/server/games/close-registration";
import { completeMatch } from "~/server/games/complete-match";
import { createGame } from "~/server/games/create";
import { createInviteLink } from "~/server/games/create-invite-link";
import { getInviteLink } from "~/server/games/get-invite-link";
import { kick } from "~/server/games/kick";
import { leaveGame } from "~/server/games/leave";
import { leaveWaitlist } from "~/server/games/leave-waitlist";
import { listCreateVenues } from "~/server/games/list-create-venues";
import { listCourts } from "~/server/games/list-courts";
import { listLookupInvites } from "~/server/games/list-lookup-invites";
import { listMyGamesHubRows } from "~/server/games/list-my-games";
import { listPublicHubRows } from "~/server/games/list-public-pickup";
import { moveSeat } from "~/server/games/move-seat";
import { pendingLookupInvites } from "~/server/games/pending-lookup-invites";
import { previewInviteLink } from "~/server/games/preview-invite-link";
import { register } from "~/server/games/register";
import { registerSeat } from "~/server/games/register-seat";
import { registerTeam } from "~/server/games/register-team";
import { registerWithPartner } from "~/server/games/register-with-partner";
import { removeSet } from "~/server/games/remove-set";
import { reopenRegistration } from "~/server/games/reopen-registration";
import { revokeLookupInvite } from "~/server/games/revoke-lookup-invite";
import { scoreSet } from "~/server/games/score-set";
import { searchLookupUsers } from "~/server/games/search-lookup-users";
import { searchPartnerUsers } from "~/server/games/search-partner-users";
import { sendLookupInvite } from "~/server/games/send-lookup-invite";
import { updateGameCaps } from "~/server/games/update-caps";
import { updateMatch } from "~/server/games/update-match";
import { updateGamePricePerPlayer } from "~/server/games/update-price-per-player";
import { updateGameWindow } from "~/server/games/update-window";
import { getAppOrigin } from "~/server/invites/tokens";
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";

const registrationModeSchema = z.enum(["individual", "team_only"]);
const createFormatSchema = z.enum([
  "friendly_game",
  "americano",
  "friendly_tournament",
]);

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
      return previewInviteLink(ctx.db, { token: input.token });
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

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
