import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues, type DbClient } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { operatorProcedure } from "#src/trpc";

/**
 * An Operator marks a Venue as a partner Venue, or takes the mark away.
 * Only a live Venue can become a partner; an archived one can still lose it.
 */
export async function setPartner(
  database: DbClient,
  args: {
    venueId: string;
    partner: boolean;
    operatorUserId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).venue.errors;
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: { id: true, archivedAt: true, partnerAt: true },
  });
  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: errors.notFound });
  }

  if (args.partner === (venue.partnerAt !== null)) {
    return { id: venue.id, isPartner: args.partner };
  }

  if (args.partner) {
    refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
      frozenMessage: errors.archivedNoPartner,
      notFoundMessage: errors.notFound,
    });
  }

  const now = new Date();
  await database
    .update(venues)
    .set({
      partnerAt: args.partner ? now : null,
      partnerBy: args.partner ? args.operatorUserId : null,
      updatedAt: now,
    })
    .where(eq(venues.id, venue.id));

  return { id: venue.id, isPartner: args.partner };
}

export const setPartnerProcedure = operatorProcedure
  .input(z.object({ venueId: z.string().uuid(), partner: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return setPartner(ctx.db, {
      venueId: input.venueId,
      partner: input.partner,
      operatorUserId: operator.id,
      locale: ctx.locale,
    });
  });
