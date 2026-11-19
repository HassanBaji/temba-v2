import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, games, matches, tournamentDraftMatches } from "@repo/db";

import { isAmericano } from "@repo/domain/tournament-americano";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import {
  isDrawnTournament,
  isKnockoutOnly,
} from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * An Americano's draw is its Rounds and King of the court's is its Starting
 * courts, so each refuses in its own words. King of the court has no Matches:
 * its result is the final order.
 */
function undoErrors(
  game: { format: string; tournamentShape: string | null },
  locale: Locale,
) {
  const messages = messagesFor(locale);
  if (isAmericano(game.format, game.tournamentShape)) {
    const m = messages.tournamentAmericano.errors;
    return {
      cancelled: m.cancelled,
      notPosted: m.noRounds,
      resultsIn: m.undoAfterScore,
    };
  }
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    const m = messages.tournamentKing.errors;
    return {
      cancelled: m.cancelled,
      notPosted: m.notDrawn,
      resultsIn: m.finalOrderPosted,
    };
  }
  const m = messages.tournament.errors;
  const noun = isKnockoutOnly(game.format, game.tournamentShape)
    ? "draw"
    : "groupDraw";
  return {
    cancelled: m.undoCancelled[noun],
    notPosted: m.notPosted[noun],
    resultsIn: noun === "draw" ? m.undoKnockoutAfterSet : m.undoAfterSet,
  };
}

export async function undoPoolDraw(
  database: DbClient,
  args: { gameId: string; organizerUserId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  const errors = undoErrors(game, locale);
  if (game.cancelledAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.cancelled });
  }
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.undoFriendly,
    });
  }
  if (game.drawPostedAt == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPosted });
  }

  const now = new Date();
  await database.transaction(async (tx) => {
    // The Game lock serialises this with a post of the draw or a Round; the
    // Match locks wait out a score being written, so the check sees it.
    const locked = await lockGame(tx, game.id, locale);
    if (locked.drawPostedAt == null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPosted });
    }
    if (locked.finalOrderPostedAt != null) {
      throw new TRPCError({ code: "FORBIDDEN", message: errors.resultsIn });
    }
    await tx
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.gameId, game.id))
      .orderBy(matches.id)
      .for("update");
    const matchRows = await tx.query.matches.findMany({
      where: eq(matches.gameId, game.id),
      with: { sets: { columns: { id: true } } },
    });
    if (
      matchRows.some(
        (match) =>
          match.sets.length > 0 ||
          match.status === "completed" ||
          match.notFinishedAt != null,
      )
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: errors.resultsIn });
    }

    await tx.delete(matches).where(eq(matches.gameId, game.id));
    await tx
      .delete(tournamentDraftMatches)
      .where(eq(tournamentDraftMatches.gameId, game.id));
    await tx
      .update(gameTeams)
      .set({
        poolIndex: null,
        knockoutSeed: null,
        startCourt: null,
        updatedAt: now,
      })
      .where(eq(gameTeams.gameId, game.id));
    await tx
      .update(games)
      .set({ drawPostedAt: null, updatedAt: now })
      .where(eq(games.id, game.id));
  });

  return { ok: true as const };
}

export const undoPoolDrawInputSchema = z.object({
  gameId: z.string().uuid(),
});

export const undoPoolDrawProcedure = protectedProcedure
  .input(undoPoolDrawInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoPoolDraw(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      locale: ctx.locale,
    });
  });
