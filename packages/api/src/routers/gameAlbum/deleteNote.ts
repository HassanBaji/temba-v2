import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gameNotes } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** A player deletes their own note on a Game, open or closed: it is theirs. */
export async function deleteNote(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const [deleted] = await database
    .delete(gameNotes)
    .where(
      and(
        eq(gameNotes.gameId, args.gameId),
        eq(gameNotes.authorUserId, args.userId),
      ),
    )
    .returning({ id: gameNotes.id });
  if (!deleted) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).gameAlbum.errors.noteNotFound,
    });
  }
  return deleted;
}

export const deleteNoteProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deleteNote(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
