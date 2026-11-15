import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import { protectedProcedure } from "#src/trpc";
import { unlinkGroupFromVenue } from "#src/groups/helpers/unlink-group-from-venue";

type DbClient = typeof db;

export async function unlinkFromVenue(
  database: DbClient,
  args: { groupId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  if (group.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.creatorUnlinks,
    });
  }
  return unlinkGroupFromVenue(database, { groupId: group.id, locale });
}

export const unlinkFromVenueProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return unlinkFromVenue(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
