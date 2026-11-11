import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { courts } from "@repo/db";
import { sportSchema } from "@repo/validators/sport";
import { type Sport } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { courtNameTaken } from "#src/venues/helpers/court-name-taken";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function addCourt(
  database: DbClient,
  args: {
    venueId: string;
    name: string;
    sport?: Sport;
    actor: Actor;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  await requireVenue(database, args.venueId, locale);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
    locale,
  });

  if (await courtNameTaken(database, args.venueId, args.name)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).venue.errors.duplicateCourt,
    });
  }

  try {
    const [created] = await database
      .insert(courts)
      .values({
        venueId: args.venueId,
        name: args.name,
        sport: args.sport,
      })
      .returning({
        id: courts.id,
        venueId: courts.venueId,
        name: courts.name,
        sport: courts.sport,
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
        message: messagesFor(locale).venue.errors.duplicateCourt,
      });
    }
    throw error;
  }
}

export const addCourtProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
      sport: sportSchema.default("padel"),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addCourt(ctx.db, {
      venueId: input.venueId,
      name: input.name,
      sport: input.sport,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
