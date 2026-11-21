import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import {
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
} from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  loadFootballDraft,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer returns the last pick of a live Captain pick to the pool
 * (ADR-0109), and the turn goes back with it. The caller names the pick
 * number they saw last, so a tap made before another pick landed is refused.
 * A Side captain cannot take a pick back.
 */
export async function undoFootballPick(
  database: DbClient,
  args: { gameId: string; userId: string; pickNumber: number; locale?: Locale },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).football.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);

  return database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    if (draft?.pick?.status !== "live") {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.pickNotLive });
    }
    const [last] = await tx
      .select({
        id: footballLineupDraftPlayers.id,
        pickNumber: footballLineupDraftPlayers.pickNumber,
        userId: gamePlayers.userId,
      })
      .from(footballLineupDraftPlayers)
      .innerJoin(
        gamePlayers,
        eq(gamePlayers.id, footballLineupDraftPlayers.gamePlayerId),
      )
      .where(
        and(
          eq(footballLineupDraftPlayers.draftId, draft.id),
          isNotNull(footballLineupDraftPlayers.pickNumber),
        ),
      )
      .orderBy(desc(footballLineupDraftPlayers.pickNumber))
      .limit(1);
    if (!last) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.pickNothingToUndo,
      });
    }
    if (last.pickNumber !== args.pickNumber) {
      throw new TRPCError({ code: "CONFLICT", message: errors.pickMovedOn });
    }
    await tx
      .delete(footballLineupDraftPlayers)
      .where(eq(footballLineupDraftPlayers.id, last.id));
    await tx
      .update(footballLineupDrafts)
      .set({ updatedAt: now })
      .where(eq(footballLineupDrafts.id, draft.id));
    return { ok: true as const, userId: last.userId };
  });
}

export const undoFootballPickProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      pickNumber: z.number().int().positive(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoFootballPick(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
