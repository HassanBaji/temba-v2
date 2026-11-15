import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import {
  assertVenueLogoType,
  decodeVenueLogoBase64,
  uploadVenueLogoObject,
  VENUE_LOGO_CONTENT_TYPES,
  type VenueLogoContentType,
} from "#src/storage/venue-logos";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

export async function uploadLogo(
  database: DbClient,
  args: {
    venueId: string;
    contentType: VenueLogoContentType;
    dataBase64: string;
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

  const bytes = decodeVenueLogoBase64(args.dataBase64, locale);
  const contentType = assertVenueLogoType(bytes, args.contentType, locale);
  const logoImageUrl = await uploadVenueLogoObject({
    venueId: args.venueId,
    bytes,
    contentType,
  });

  const [updated] = await database
    .update(venues)
    .set({
      logoImageUrl,
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
      message: "Failed to save Venue logo",
    });
  }

  return updated;
}

export const uploadLogoProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      contentType: z.enum(VENUE_LOGO_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return uploadLogo(ctx.db, {
      venueId: input.venueId,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
