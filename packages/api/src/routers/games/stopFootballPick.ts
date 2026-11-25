import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { z } from "zod";

import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  clearFootballPick,
  loadFootballDraft,
} from "#src/games/football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer stops a Captain pick that waits or is live (ADR-0109): the
 * room reads stopped for everyone and what was picked stays as a Manual
 * Draft line-up, with the Side captains on their sides and the rest to
 * place.
 */
export async function stopFootballPick(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);

  return database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    if (!draft?.pick || draft.pick.status === "done") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).football.errors.pickNotRunning,
      });
    }
    await clearFootballPick(tx, draft.id, now);
    return { ok: true as const };
  });
}

export const stopFootballPickProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return stopFootballPick(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
