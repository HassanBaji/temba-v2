import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { acceptInviteLink } from "~/server/communities/accept-invite-link";
import { acceptLookupInvite } from "~/server/communities/accept-lookup-invite";
import { approveJoinRequest } from "~/server/communities/approve-join-request";
import { approveTeamLink } from "~/server/communities/approve-team-link";
import { createInviteLink } from "~/server/communities/create-invite-link";
import { getInviteLink } from "~/server/communities/get-invite-link";
import { listJoinRequests } from "~/server/communities/list-join-requests";
import { listLookupInvites } from "~/server/communities/list-lookup-invites";
import { listTeamLinkRequests } from "~/server/communities/list-team-link-requests";
import { pendingLookupInvites } from "~/server/communities/pending-lookup-invites";
import { previewInviteLink } from "~/server/communities/preview-invite-link";
import { rejectJoinRequest } from "~/server/communities/reject-join-request";
import { rejectTeamLink } from "~/server/communities/reject-team-link";
import { requestJoin } from "~/server/communities/request-join";
import { requestVenueLink } from "~/server/communities/request-venue-link";
import { revokeLookupInvite } from "~/server/communities/revoke-lookup-invite";
import { searchLiveVenues } from "~/server/communities/search-live-venues";
import { searchLookupUsers } from "~/server/communities/search-lookup-users";
import { sendLookupInvite } from "~/server/communities/send-lookup-invite";
import { unlinkVenue } from "~/server/communities/unlink-venue";
import { getAppOrigin } from "~/server/invites/tokens";

import { addSportProcedure as addSport } from "./addSport";
import { byId } from "./byId";
import { create } from "./create";
import { leave } from "./leave";
import { listMembersProcedure as listMembers } from "./listMembers";
import { mineProcedure as mine } from "./mine";
import { removeSportProcedure as removeSport } from "./removeSport";
import { setMemberRoleProcedure as setMemberRole } from "./setMemberRole";
import { softArchiveProcedure as softArchive } from "./softArchive";
import { unarchiveProcedure as unarchive } from "./unarchive";

export const communitiesRouter = createTRPCRouter({
  create,
  byId,
  listMembers,
  setMemberRole,
  softArchive,
  unarchive,
  leave,
  addSport,
  removeSport,

  listTeamLinkRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listTeamLinkRequests(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  approveTeamLink: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return approveTeamLink(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  rejectTeamLink: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return rejectTeamLink(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  mine,

  requestJoin: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return requestJoin(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  listJoinRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listJoinRequests(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  approveJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return approveJoinRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  rejectJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return rejectJoinRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  searchLookupUsers: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return searchLookupUsers(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        query: input.query,
      });
    }),

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return sendLookupInvite(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        userIds: input.userIds,
      });
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listLookupInvites(ctx.db, {
        communityId: input.communityId,
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
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return acceptLookupInvite(ctx.db, {
        inviteId: input.inviteId,
        userId: appUser.id,
      });
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return getInviteLink(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        origin: getAppOrigin(ctx.headers),
      });
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createInviteLink(ctx.db, {
        communityId: input.communityId,
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
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return acceptInviteLink(ctx.db, {
        token: input.token,
        userId: appUser.id,
      });
    }),

  searchLiveVenues: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return searchLiveVenues(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        query: input.query,
      });
    }),

  requestVenueLink: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        venueId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return requestVenueLink(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        venueId: input.venueId,
      });
    }),

  unlinkVenue: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return unlinkVenue(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),
});
