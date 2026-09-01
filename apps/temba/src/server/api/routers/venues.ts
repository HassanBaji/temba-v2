import { z } from "zod";

import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { addCourt } from "~/server/venues/add-court";
import { approveLinkRequest } from "~/server/venues/approve-link-request";
import { venueById } from "~/server/venues/by-id";
import { clearLogo } from "~/server/venues/clear-logo";
import { createVenue } from "~/server/venues/create";
import { deleteCourt } from "~/server/venues/delete-court";
import { listVenues } from "~/server/venues/list";
import { listPendingLinkRequests } from "~/server/venues/list-pending-link-requests";
import { rejectLinkRequest } from "~/server/venues/reject-link-request";
import { renameCourt } from "~/server/venues/rename-court";
import { softArchive } from "~/server/venues/soft-archive";
import { unarchive } from "~/server/venues/unarchive";
import { updateVenue } from "~/server/venues/update";
import { uploadLogo } from "~/server/venues/upload-logo";
import { VENUE_LOGO_CONTENT_TYPES } from "~/server/venues/utils";

const venueWriteSchema = z.object({
  name: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(255),
  country: z.string().trim().min(1).max(255),
  latitude: z.number().gte(-90).lte(90).nullable().optional(),
  longitude: z.number().gte(-180).lte(180).nullable().optional(),
});

export const venuesRouter = createTRPCRouter({
  list: operatorProcedure.query(async ({ ctx }) => {
    return listVenues(ctx.db);
  }),

  byId: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return venueById(ctx.db, { venueId: input.id });
    }),

  create: operatorProcedure
    .input(venueWriteSchema)
    .mutation(async ({ ctx, input }) => {
      return createVenue(ctx.db, {
        name: input.name,
        city: input.city,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }),

  update: operatorProcedure
    .input(
      venueWriteSchema.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateVenue(ctx.db, {
        id: input.id,
        name: input.name,
        city: input.city,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }),

  addCourt: operatorProcedure
    .input(
      z.object({
        venueId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return addCourt(ctx.db, {
        venueId: input.venueId,
        name: input.name,
      });
    }),

  renameCourt: operatorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return renameCourt(ctx.db, {
        courtId: input.id,
        name: input.name,
      });
    }),

  deleteCourt: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return deleteCourt(ctx.db, { courtId: input.id });
    }),

  uploadLogo: operatorProcedure
    .input(
      z.object({
        venueId: z.string().uuid(),
        contentType: z.enum(VENUE_LOGO_CONTENT_TYPES),
        dataBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return uploadLogo(ctx.db, {
        venueId: input.venueId,
        contentType: input.contentType,
        dataBase64: input.dataBase64,
      });
    }),

  clearLogo: operatorProcedure
    .input(z.object({ venueId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return clearLogo(ctx.db, { venueId: input.venueId });
    }),

  softArchive: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return softArchive(ctx.db, { venueId: input.id });
    }),

  unarchive: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return unarchive(ctx.db, { venueId: input.id });
    }),

  listPendingLinkRequests: operatorProcedure.query(async ({ ctx }) => {
    return listPendingLinkRequests(ctx.db);
  }),

  approveLinkRequest: operatorProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return approveLinkRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),

  rejectLinkRequest: operatorProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      return rejectLinkRequest(ctx.db, {
        requestId: input.requestId,
        userId: appUser.id,
      });
    }),
});
