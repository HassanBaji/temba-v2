import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { acceptInviteLink } from "~/server/games/accept-invite-link";
import { acceptLookupInvite } from "~/server/games/accept-lookup-invite";
import { createInviteLink } from "~/server/games/create-invite-link";
import { getInviteLink } from "~/server/games/get-invite-link";
import { listLookupInvites } from "~/server/games/list-lookup-invites";
import { pendingLookupInvites } from "~/server/games/pending-lookup-invites";
import { previewInviteLink } from "~/server/games/preview-invite-link";
import { revokeLookupInvite } from "~/server/games/revoke-lookup-invite";
import { searchLookupUsers } from "~/server/games/search-lookup-users";
import { sendLookupInvite } from "~/server/games/send-lookup-invite";
import { getAppOrigin } from "~/server/invites/tokens";

import { addMatchProcedure as addMatch } from "./addMatch";
import { addSetProcedure as addSet } from "./addSet";
import { approveLevelRangeRequestProcedure as approveLevelRangeRequest } from "./approveLevelRangeRequest";
import { byId } from "./byId";
import { cancel } from "./cancel";
import { cancelMatchProcedure as cancelMatch } from "./cancelMatch";
import { closeRegistrationProcedure as closeRegistration } from "./closeRegistration";
import { completeMatchProcedure as completeMatch } from "./completeMatch";
import { create } from "./create";
import { getSecretMessage } from "./getSecretMessage";
import { hello } from "./hello";
import { kickProcedure as kick } from "./kick";
import { leave } from "./leave";
import { leaveWaitlistProcedure as leaveWaitlist } from "./leaveWaitlist";
import { listCourtsProcedure as listCourts } from "./listCourts";
import { listCreateVenues } from "./listCreateVenues";
import { listLevelRangeRequestsProcedure as listLevelRangeRequests } from "./listLevelRangeRequests";
import { listMyGames } from "./listMyGames";
import { listPublicPickup } from "./listPublicPickup";
import { moveSeatProcedure as moveSeat } from "./moveSeat";
import { registerProcedure as register } from "./register";
import { registerSeatProcedure as registerSeat } from "./registerSeat";
import { registerTeamProcedure as registerTeam } from "./registerTeam";
import { registerWithPartnerProcedure as registerWithPartner } from "./registerWithPartner";
import { rejectLevelRangeRequestProcedure as rejectLevelRangeRequest } from "./rejectLevelRangeRequest";
import { removeSetProcedure as removeSet } from "./removeSet";
import { reopenRegistrationProcedure as reopenRegistration } from "./reopenRegistration";
import { requestLevelRangeProcedure as requestLevelRange } from "./requestLevelRange";
import { scoreSetProcedure as scoreSet } from "./scoreSet";
import { searchPartnerUsersProcedure as searchPartnerUsers } from "./searchPartnerUsers";
import { updateCaps } from "./updateCaps";
import { updateLevelRange } from "./updateLevelRange";
import { updateMatchProcedure as updateMatch } from "./updateMatch";
import { updatePricePerPlayer } from "./updatePricePerPlayer";
import { updateWindow } from "./updateWindow";

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
  closeRegistration,
  reopenRegistration,
  cancel,
  cancelMatch,
  updateWindow,
  updatePricePerPlayer,
  updateLevelRange,
  requestLevelRange,
  listLevelRangeRequests,
  approveLevelRangeRequest,
  rejectLevelRangeRequest,
  updateCaps,
  listCourts,
  addMatch,
  updateMatch,
  addSet,
  scoreSet,
  removeSet,
  completeMatch,

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
