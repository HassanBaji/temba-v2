import { TRPCError } from "@trpc/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { courts, venues } from "@repo/db";

import { type db } from "~/server/db";
import { createTRPCRouter, operatorProcedure } from "~/server/api/trpc";

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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
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
    columns: { id: true },
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

      return venue;
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
});
