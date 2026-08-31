import { TRPCError } from "@trpc/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import {
  courts,
  communities,
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
  venues,
} from "@repo/db";

import { type db } from "~/server/db";
import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";
import {
  assertVenueLogoType,
  decodeVenueLogoBase64,
  removeVenueLogoObject,
  uploadVenueLogoObject,
  VENUE_LOGO_CONTENT_TYPES,
} from "~/server/storage/venue-logos";

const venueWriteSchema = z.object({
  name: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(255),
  country: z.string().trim().min(1).max(255),
  latitude: z.number().gte(-90).lte(90).nullable().optional(),
  longitude: z.number().gte(-180).lte(180).nullable().optional(),
});

type DbClient = typeof db;

function coordToDecimal(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

async function venueIdentityTaken(
  database: DbClient,
  name: string,
  city: string,
  country: string,
  exceptId?: string,
) {
  const [row] = await database
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        sql`lower(btrim(${venues.name})) = lower(${name})`,
        sql`lower(btrim(${venues.city})) = lower(${city})`,
        sql`lower(btrim(${venues.country})) = lower(${country})`,
        exceptId ? ne(venues.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return Boolean(row);
}

const duplicateVenueMessage =
  "A Venue with this name, city, and country already exists";
const duplicateCourtMessage =
  "A Court with this name already exists on this Venue";

async function requireVenue(database: DbClient, id: string) {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, id),
    columns: { id: true, archivedAt: true },
  });

  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  return venue;
}

async function courtNameTaken(
  database: DbClient,
  venueId: string,
  name: string,
  exceptId?: string,
) {
  const [row] = await database
    .select({ id: courts.id })
    .from(courts)
    .where(
      and(
        eq(courts.venueId, venueId),
        sql`lower(btrim(${courts.name})) = lower(${name})`,
        exceptId ? ne(courts.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return Boolean(row);
}

export const venuesRouter = createTRPCRouter({
  list: operatorProcedure.query(async ({ ctx }) => {
    return ctx.db.query.venues.findMany({
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (table, { asc }) => [
        asc(table.name),
        asc(table.city),
        asc(table.country),
      ],
    });
  }),

  byId: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const venue = await ctx.db.query.venues.findFirst({
        where: eq(venues.id, input.id),
        columns: {
          id: true,
          name: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
          logoImageUrl: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          courts: {
            columns: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: (table, { asc }) => [asc(table.createdAt)],
          },
        },
      });

      if (!venue) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      const linkedCommunities = await ctx.db.query.communities.findMany({
        where: eq(communities.venueId, venue.id),
        columns: {
          id: true,
          name: true,
          archivedAt: true,
        },
        orderBy: (table, { asc }) => [asc(table.name)],
      });

      return {
        ...venue,
        linkedCommunities,
      };
    }),

  create: operatorProcedure
    .input(venueWriteSchema)
    .mutation(async ({ ctx, input }) => {
      if (
        await venueIdentityTaken(ctx.db, input.name, input.city, input.country)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: duplicateVenueMessage,
        });
      }

      try {
        const [created] = await ctx.db
          .insert(venues)
          .values({
            name: input.name,
            city: input.city,
            country: input.country,
            latitude: coordToDecimal(input.latitude),
            longitude: coordToDecimal(input.longitude),
          })
          .returning({
            id: venues.id,
            name: venues.name,
            city: venues.city,
            country: venues.country,
            latitude: venues.latitude,
            longitude: venues.longitude,
            createdAt: venues.createdAt,
            updatedAt: venues.updatedAt,
          });

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Venue",
          });
        }

        return created;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateVenueMessage,
          });
        }
        throw error;
      }
    }),

  update: operatorProcedure
    .input(
      venueWriteSchema.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.venues.findFirst({
        where: eq(venues.id, input.id),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      if (
        await venueIdentityTaken(
          ctx.db,
          input.name,
          input.city,
          input.country,
          input.id,
        )
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: duplicateVenueMessage,
        });
      }

      try {
        const [updated] = await ctx.db
          .update(venues)
          .set({
            name: input.name,
            city: input.city,
            country: input.country,
            latitude: coordToDecimal(input.latitude),
            longitude: coordToDecimal(input.longitude),
            updatedAt: new Date(),
          })
          .where(eq(venues.id, input.id))
          .returning({
            id: venues.id,
            name: venues.name,
            city: venues.city,
            country: venues.country,
            latitude: venues.latitude,
            longitude: venues.longitude,
            createdAt: venues.createdAt,
            updatedAt: venues.updatedAt,
          });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update Venue",
          });
        }

        return updated;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateVenueMessage,
          });
        }
        throw error;
      }
    }),

  addCourt: operatorProcedure
    .input(
      z.object({
        venueId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireVenue(ctx.db, input.venueId);

      if (await courtNameTaken(ctx.db, input.venueId, input.name)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: duplicateCourtMessage,
        });
      }

      try {
        const [created] = await ctx.db
          .insert(courts)
          .values({
            venueId: input.venueId,
            name: input.name,
          })
          .returning({
            id: courts.id,
            venueId: courts.venueId,
            name: courts.name,
            createdAt: courts.createdAt,
            updatedAt: courts.updatedAt,
          });

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add Court",
          });
        }

        return created;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCourtMessage,
          });
        }
        throw error;
      }
    }),

  renameCourt: operatorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.courts.findFirst({
        where: eq(courts.id, input.id),
        columns: { id: true, venueId: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Court not found" });
      }

      if (
        await courtNameTaken(ctx.db, existing.venueId, input.name, existing.id)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: duplicateCourtMessage,
        });
      }

      try {
        const [updated] = await ctx.db
          .update(courts)
          .set({
            name: input.name,
            updatedAt: new Date(),
          })
          .where(eq(courts.id, input.id))
          .returning({
            id: courts.id,
            venueId: courts.venueId,
            name: courts.name,
            createdAt: courts.createdAt,
            updatedAt: courts.updatedAt,
          });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to rename Court",
          });
        }

        return updated;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: duplicateCourtMessage,
          });
        }
        throw error;
      }
    }),

  deleteCourt: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.courts.findFirst({
        where: eq(courts.id, input.id),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Court not found" });
      }

      await ctx.db.delete(courts).where(eq(courts.id, input.id));
      return { id: existing.id };
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
      await requireVenue(ctx.db, input.venueId);

      const bytes = decodeVenueLogoBase64(input.dataBase64);
      const contentType = assertVenueLogoType(bytes, input.contentType);
      const logoImageUrl = await uploadVenueLogoObject({
        venueId: input.venueId,
        bytes,
        contentType,
      });

      const [updated] = await ctx.db
        .update(venues)
        .set({
          logoImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, input.venueId))
        .returning({
          id: venues.id,
          logoImageUrl: venues.logoImageUrl,
        });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save Venue logo",
        });
      }

      return updated;
    }),

  clearLogo: operatorProcedure
    .input(z.object({ venueId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireVenue(ctx.db, input.venueId);
      await removeVenueLogoObject(input.venueId);

      const [updated] = await ctx.db
        .update(venues)
        .set({
          logoImageUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, input.venueId))
        .returning({
          id: venues.id,
          logoImageUrl: venues.logoImageUrl,
        });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clear Venue logo",
        });
      }

      return updated;
    }),

  softArchive: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const venue = await requireVenue(ctx.db, input.id);

      if (venue.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Venue is already Soft-archived",
        });
      }

      // Soft-archive hides the Venue from the Community request catalog.
      // Edits stay allowed. Live Community pointers are not cleared.
      const [updated] = await ctx.db
        .update(venues)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venue.id))
        .returning({
          id: venues.id,
          archivedAt: venues.archivedAt,
        });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to Soft-archive Venue",
        });
      }

      return updated;
    }),

  unarchive: operatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const venue = await requireVenue(ctx.db, input.id);

      if (!venue.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Venue is not Soft-archived",
        });
      }

      const [updated] = await ctx.db
        .update(venues)
        .set({
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venue.id))
        .returning({
          id: venues.id,
          archivedAt: venues.archivedAt,
        });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unarchive Venue",
        });
      }

      return updated;
    }),

  listPendingLinkRequests: operatorProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.venueLinkRequests.findMany({
      where: eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
      with: {
        community: {
          columns: {
            id: true,
            name: true,
            archivedAt: true,
          },
        },
        venue: {
          columns: {
            id: true,
            name: true,
            city: true,
            country: true,
            archivedAt: true,
          },
        },
        requestedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      community: row.community,
      venue: row.venue,
      requestedBy: row.requestedBy,
    }));
  }),

  approveLinkRequest: operatorProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const request = await ctx.db.query.venueLinkRequests.findFirst({
        where: eq(venueLinkRequests.id, input.requestId),
        with: {
          community: true,
          venue: true,
        },
      });

      if (request?.status !== VenueLinkRequestStatusEnum.PENDING) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue link request is not available",
        });
      }

      if (request.community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot decide Venue link requests for an archived Community",
        });
      }

      if (request.venue.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot decide Venue link requests for a Soft-archived Venue",
        });
      }

      if (request.community.venueId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Community already has a Venue link",
        });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(communities)
          .set({
            venueId: request.venueId,
            updatedAt: new Date(),
          })
          .where(eq(communities.id, request.communityId));

        const [updated] = await tx
          .update(venueLinkRequests)
          .set({
            status: VenueLinkRequestStatusEnum.APPROVED,
            decidedBy: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(venueLinkRequests.id, request.id),
              eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Venue link request is no longer pending",
          });
        }
      });

      return {
        ok: true as const,
        communityId: request.communityId,
        venueId: request.venueId,
      };
    }),

  rejectLinkRequest: operatorProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const request = await ctx.db.query.venueLinkRequests.findFirst({
        where: eq(venueLinkRequests.id, input.requestId),
        with: {
          community: true,
          venue: true,
        },
      });

      if (request?.status !== VenueLinkRequestStatusEnum.PENDING) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue link request is not available",
        });
      }

      if (request.community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot decide Venue link requests for an archived Community",
        });
      }

      if (request.venue.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot decide Venue link requests for a Soft-archived Venue",
        });
      }

      const [updated] = await ctx.db
        .update(venueLinkRequests)
        .set({
          status: VenueLinkRequestStatusEnum.REJECTED,
          decidedBy: appUser.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(venueLinkRequests.id, request.id),
            eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Venue link request is no longer pending",
        });
      }

      return {
        ok: true as const,
        communityId: request.communityId,
        venueId: request.venueId,
      };
    }),
});
