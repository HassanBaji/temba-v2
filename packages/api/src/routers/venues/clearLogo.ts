import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { removeVenueLogoObject } from "#src/storage/venue-logos";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function clearLogo(
  database: DbClient,
  args: { venueId: string; actor: Actor; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  await requireVenue(database, args.venueId, locale);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
    locale,
  });
  await removeVenueLogoObject(args.venueId);

  const [updated] = await database
    .update(venues)
    .set({
      logoImageUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, args.venueId))
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
}

export const clearLogoProcedure = protectedProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return clearLogo(ctx.db, {
      venueId: input.venueId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
