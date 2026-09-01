import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { getAppOrigin } from "~/server/invites/tokens";
import { acceptInAppInvite } from "~/server/teams/accept-in-app-invite";
import { acceptInviteLink } from "~/server/teams/accept-invite-link";
import { teamById } from "~/server/teams/by-id";
import { createTeam } from "~/server/teams/create";
import { createInviteLink } from "~/server/teams/create-invite-link";
import { dissolve } from "~/server/teams/dissolve";
import { getInviteLink } from "~/server/teams/get-invite-link";
import { inviteInApp } from "~/server/teams/invite-in-app";
import { listInAppInvites } from "~/server/teams/list-in-app-invites";
import { mine } from "~/server/teams/mine";
import { pendingInvites } from "~/server/teams/pending-invites";
import { previewInviteLink } from "~/server/teams/preview-invite-link";
import { requestLink } from "~/server/teams/request-link";
import { revokeInAppInvite } from "~/server/teams/revoke-in-app-invite";
import { searchLookupUsers } from "~/server/teams/search-lookup-users";
import { unlink } from "~/server/teams/unlink";

const sportSchema = z.enum(["padel", "football"]);

export const teamsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createTeam(ctx.db, {
        name: input.name,
        sport: input.sport,
        userId: appUser.id,
        userName: appUser.name,
      });
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mine(ctx.db, { userId: appUser.id });
  }),

  pendingInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingInvites(ctx.db, { userId: appUser.id });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return teamById(ctx.db, { teamId: input.id, userId: appUser.id });
    }),

  searchLookupUsers: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return searchLookupUsers(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
        query: input.query,
      });
    }),

  inviteInApp: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return inviteInApp(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
        inviteeUserId: input.userId,
      });
    }),

  listInAppInvites: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listInAppInvites(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
      });
    }),

  revokeInAppInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return revokeInAppInvite(ctx.db, {
        inviteId: input.inviteId,
        userId: appUser.id,
      });
    }),

  acceptInAppInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return acceptInAppInvite(ctx.db, {
        inviteId: input.inviteId,
        userId: appUser.id,
      });
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return getInviteLink(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
        origin: getAppOrigin(ctx.headers),
      });
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createInviteLink(ctx.db, {
        teamId: input.teamId,
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

  requestLink: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        communityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return requestLink(ctx.db, {
        teamId: input.teamId,
        communityId: input.communityId,
        userId: appUser.id,
      });
    }),

  unlink: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return unlink(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
      });
    }),

  dissolve: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return dissolve(ctx.db, {
        teamId: input.teamId,
        userId: appUser.id,
      });
    }),
});
