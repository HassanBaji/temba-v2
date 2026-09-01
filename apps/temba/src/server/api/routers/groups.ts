import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { acceptInviteLink } from "~/server/groups/accept-invite-link";
import { acceptLookupInvite } from "~/server/groups/accept-lookup-invite";
import { groupById } from "~/server/groups/by-id";
import { createClubPrivate } from "~/server/groups/create-club-private";
import { createClubPublic } from "~/server/groups/create-club-public";
import { createInviteLink } from "~/server/groups/create-invite-link";
import { createLoosePrivate } from "~/server/groups/create-loose-private";
import { createLoosePublic } from "~/server/groups/create-loose-public";
import { deleteGroup } from "~/server/groups/delete";
import { getInviteLink } from "~/server/groups/get-invite-link";
import { joinClubPublic } from "~/server/groups/join-club-public";
import { joinLoosePublic } from "~/server/groups/join-loose-public";
import { leaveGroup } from "~/server/groups/leave";
import { listLookupInvites } from "~/server/groups/list-lookup-invites";
import { mine } from "~/server/groups/mine";
import { mineLoose } from "~/server/groups/mine-loose";
import { pendingLookupInvites } from "~/server/groups/pending-lookup-invites";
import { previewInviteLink } from "~/server/groups/preview-invite-link";
import { revokeLookupInvite } from "~/server/groups/revoke-lookup-invite";
import { searchLookupUsers } from "~/server/groups/search-lookup-users";
import { sendLookupInvite } from "~/server/groups/send-lookup-invite";
import { getAppOrigin } from "~/server/invites/tokens";

const sportSchema = z.enum(["padel", "football"]);

export const groupsRouter = createTRPCRouter({
  createClubPublic: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createClubPublic(ctx.db, {
        communityId: input.communityId,
        name: input.name,
        description: input.description,
        sport: input.sport,
        userId: appUser.id,
      });
    }),

  createClubPrivate: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createClubPrivate(ctx.db, {
        communityId: input.communityId,
        name: input.name,
        description: input.description,
        sport: input.sport,
        userId: appUser.id,
      });
    }),

  createLoosePublic: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createLoosePublic(ctx.db, {
        name: input.name,
        description: input.description,
        sport: input.sport,
        userId: appUser.id,
      });
    }),

  createLoosePrivate: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createLoosePrivate(ctx.db, {
        name: input.name,
        description: input.description,
        sport: input.sport,
        userId: appUser.id,
      });
    }),

  /** Loose Groups the caller belongs to (Club Groups live under Communities). */
  mineLoose: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mineLoose(ctx.db, { userId: appUser.id });
  }),

  /** Groups the caller is a member of (Loose Groups and joined Club Groups). */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mine(ctx.db, { userId: appUser.id });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return groupById(ctx.db, { groupId: input.id, userId: appUser.id });
    }),

  joinClubPublic: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return joinClubPublic(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
      });
    }),

  joinLoosePublic: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return joinLoosePublic(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
      });
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return leaveGroup(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return deleteGroup(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
      });
    }),

  searchLookupUsers: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        query: z.string().trim().max(255),
      }),
    )
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return searchLookupUsers(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
        query: input.query,
      });
    }),

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return sendLookupInvite(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
        userIds: input.userIds,
      });
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return listLookupInvites(ctx.db, {
        groupId: input.groupId,
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
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return getInviteLink(ctx.db, {
        groupId: input.groupId,
        userId: appUser.id,
        origin: getAppOrigin(ctx.headers),
      });
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return createInviteLink(ctx.db, {
        groupId: input.groupId,
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
});
