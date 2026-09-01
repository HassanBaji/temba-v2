import { z } from "zod";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { acceptInviteLink } from "~/server/communities/accept-invite-link";
import { acceptLookupInvite } from "~/server/communities/accept-lookup-invite";
import { addSport } from "~/server/communities/add-sport";
import { approveJoinRequest } from "~/server/communities/approve-join-request";
import { approveTeamLink } from "~/server/communities/approve-team-link";
import { communityById } from "~/server/communities/by-id";
import { createCommunity } from "~/server/communities/create";
import { createInviteLink } from "~/server/communities/create-invite-link";
import { getInviteLink } from "~/server/communities/get-invite-link";
import { leave as leaveCommunity } from "~/server/communities/leave";
import { listJoinRequests } from "~/server/communities/list-join-requests";
import { listLookupInvites } from "~/server/communities/list-lookup-invites";
import { listMembers } from "~/server/communities/list-members";
import { listTeamLinkRequests } from "~/server/communities/list-team-link-requests";
import { mine } from "~/server/communities/mine";
import { pendingLookupInvites } from "~/server/communities/pending-lookup-invites";
import { previewInviteLink } from "~/server/communities/preview-invite-link";
import { rejectJoinRequest } from "~/server/communities/reject-join-request";
import { rejectTeamLink } from "~/server/communities/reject-team-link";
import { removeSport } from "~/server/communities/remove-sport";
import { requestJoin } from "~/server/communities/request-join";
import { requestVenueLink } from "~/server/communities/request-venue-link";
import { revokeLookupInvite } from "~/server/communities/revoke-lookup-invite";
import { searchLiveVenues } from "~/server/communities/search-live-venues";
import { searchLookupUsers } from "~/server/communities/search-lookup-users";
import { sendLookupInvite } from "~/server/communities/send-lookup-invite";
import { setMemberRole } from "~/server/communities/set-member-role";
import { softArchive } from "~/server/communities/soft-archive";
import { unarchive } from "~/server/communities/unarchive";
import { unlinkVenue } from "~/server/communities/unlink-venue";
import { getAppOrigin } from "~/server/invites/tokens";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

export const communitiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        type: communityTypeSchema,
        sports: z.array(sportSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createCommunity(ctx.db, {
        name: input.name,
        description: input.description,
        type: input.type,
        sports: input.sports,
        userId: appUser.id,
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return communityById(ctx.db, {
        communityId: input.id,
        userId: appUser.id,
      });
    }),

  listMembers: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listMembers(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  setMemberRole: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return setMemberRole(ctx.db, {
        communityId: input.communityId,
        callerId: appUser.id,
        userId: input.userId,
        role: input.role,
      });
    }),

  softArchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return softArchive(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return unarchive(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  leave: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return leaveCommunity(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  addSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return addSport(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        sport: input.sport,
      });
    }),

  removeSport: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return removeSport(ctx.db, {
        communityId: input.communityId,
        userId: appUser.id,
        sport: input.sport,
      });
    }),

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

  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mine(ctx.db, { userId: appUser.id });
  }),

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
