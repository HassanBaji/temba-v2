import { eq } from "drizzle-orm";
import { z } from "zod";

import { venueClosures } from "@repo/db";
import type { DbClient } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

export async function removeClosure(
  database: DbClient,
  args: {
    closureId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const closure = await database.query.venueClosures.findFirst({
    where: eq(venueClosures.id, args.closureId),
    columns: { id: true, venueId: true },
  });

  if (!closure) {
    return { ok: true as const };
  }

  await requireVenueManager(database, {
    venueId: closure.venueId,
    ...args.actor,
    locale,
  });

  await database
    .delete(venueClosures)
    .where(eq(venueClosures.id, args.closureId));

  return { ok: true as const };
}

export const removeClosureProcedure = protectedProcedure
  .input(z.object({ closureId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removeClosure(ctx.db, {
      closureId: input.closureId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
