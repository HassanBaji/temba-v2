import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teams } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { removeTeamImageObject } from "#src/storage/team-images";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

export async function clearImage(
  database: DbClient,
  args: { teamId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = await requireTeam(database, args.teamId, locale);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).team.errors.captainImage,
    });
  }

  await removeTeamImageObject(team.id);

  const [updated] = await database
    .update(teams)
    .set({ imageUrl: null, updatedAt: new Date() })
    .where(eq(teams.id, team.id))
    .returning({ id: teams.id, imageUrl: teams.imageUrl });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Team image",
    });
  }

  return updated;
}

export const clearImageProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return clearImage(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
