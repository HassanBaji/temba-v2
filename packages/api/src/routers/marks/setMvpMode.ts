import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, games, matches } from "@repo/db";

import { MVP_MODES, type MvpMode } from "@repo/domain/marks";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { marksMatch } from "#src/marks/match-participants";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * An Organizer changes how a Friendly game decides its MVP. Allowed until the
 * Match completes; the Match row lock keeps a change from racing the score's
 * confirmation, after which the mode is fixed.
 */
export async function setMvpMode(
  database: DbClient,
  args: { gameId: string; userId: string; mode: MvpMode; locale?: Locale },
): Promise<{ mode: MvpMode }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.format !== "friendly_game" || game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).marks.errors.mvpFriendlyOnly,
    });
  }

  await database.transaction(async (tx) => {
    const match = await marksMatch(tx, game);
    if (match) {
      const [locked] = await tx
        .select({ status: matches.status })
        .from(matches)
        .where(eq(matches.id, match.id))
        .for("update");
      if (locked?.status === MatchStatusEnum.COMPLETED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: messagesFor(locale).marks.errors.mvpModeFixed,
        });
      }
    }
    await tx
      .update(games)
      .set({ mvpMode: args.mode, updatedAt: new Date() })
      .where(eq(games.id, game.id));
  });

  return { mode: args.mode };
}

export const setMvpModeProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      mode: z.enum(MVP_MODES),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMvpMode(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      mode: input.mode,
      locale: ctx.locale,
    });
  });
