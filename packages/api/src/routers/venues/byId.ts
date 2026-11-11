import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { groups, venues } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { operatorProcedure } from "#src/trpc";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function venueById(
  database: DbClient,
  args: { venueId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
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
          sport: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
  });

  if (!venue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.notFound,
    });
  }

  const linkedGroups = await database.query.groups.findMany({
    where: and(eq(groups.venueId, venue.id), isNull(groups.deletedAt)),
    columns: {
      id: true,
      name: true,
      sport: true,
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  return {
    ...venue,
    linkedGroups,
  };
}

export const byId = operatorProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    return venueById(ctx.db, { venueId: input.id, locale: ctx.locale });
  });
