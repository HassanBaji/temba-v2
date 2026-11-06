import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import { LOCALES, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const setLocaleSchema = z.object({ locale: z.enum(LOCALES) });

/**
 * The Stored Locale: the clients mirror the language they show so a
 * Notification email can be written in it (ADR-0054).
 */
export async function writeLocale(
  database: DbClient,
  args: { userId: string; locale: Locale },
) {
  await database
    .update(user)
    .set({ locale: args.locale, updatedAt: new Date() })
    .where(eq(user.id, args.userId));
  return { locale: args.locale };
}

export const setLocale = protectedProcedure
  .input(setLocaleSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writeLocale(ctx.db, { userId: appUser.id, locale: input.locale });
  });
