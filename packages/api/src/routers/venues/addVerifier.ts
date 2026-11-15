import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  user,
  VENUE_VERIFIER_KIND_VALUES,
  venueVerifiers,
  venues,
} from "@repo/db";
import type { DbClient } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { operatorProcedure } from "#src/trpc";

export type VenueVerifierKind = (typeof VENUE_VERIFIER_KIND_VALUES)[number];

/** An Operator grants a User as a Verifier of one Venue (ADR-0072). */
export async function addVerifier(
  database: DbClient,
  args: {
    venueId: string;
    userId: string;
    kind: VenueVerifierKind;
    grantedByUserId: string | null;
    locale?: Locale;
  },
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

  const target = await database.query.user.findFirst({
    where: eq(user.id, args.userId),
    columns: { id: true },
  });
  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).profile.errors.userNotFound,
    });
  }

  try {
    const [created] = await database
      .insert(venueVerifiers)
      .values({
        venueId: venue.id,
        userId: target.id,
        kind: args.kind,
        grantedByUserId: args.grantedByUserId,
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add Verifier",
      });
    }
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).venue.errors.alreadyVerifier,
      });
    }
    throw error;
  }
}

export const addVerifierProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      userId: z.string().uuid(),
      kind: z.enum(VENUE_VERIFIER_KIND_VALUES),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const caller = await resolveAppUser(ctx.userId);
    return addVerifier(ctx.db, {
      venueId: input.venueId,
      userId: input.userId,
      kind: input.kind,
      grantedByUserId: caller.id,
      locale: ctx.locale,
    });
  });
