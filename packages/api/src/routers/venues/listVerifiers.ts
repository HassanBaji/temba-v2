import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venueVerifiers, venues } from "@repo/db";
import type { DbClient } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { operatorProcedure } from "#src/trpc";

/** A Venue's Verifiers, oldest grant first, for the Operator Venue page. */
export async function listVerifiers(
  database: DbClient,
  args: { venueId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: { id: true },
  });
  if (!venue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.notFound,
    });
  }

  const rows = await database.query.venueVerifiers.findMany({
    where: eq(venueVerifiers.venueId, venue.id),
    columns: { id: true, userId: true, kind: true, createdAt: true },
    with: {
      user: { columns: { name: true, username: true, image: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    username: row.user.username,
    image: row.user.image,
    kind: row.kind,
    createdAt: row.createdAt,
  }));
}

export const listVerifiersProcedure = operatorProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    return listVerifiers(ctx.db, {
      venueId: input.venueId,
      locale: ctx.locale,
    });
  });
