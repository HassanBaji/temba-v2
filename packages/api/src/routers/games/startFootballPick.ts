import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { footballLineupDrafts } from "@repo/db";
import { firstPickSide } from "@repo/domain/football-captain-pick";
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
 * The Organizer starts a waiting Captain pick without waiting for both Side
 * captains (ADR-0109, decision 7): they can pick for a captain who is not
 * in the room. The toss, when the first pick is one, is made here.
 */
export async function startFootballPick(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
  random: () => number = Math.random,
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
    if (!draft?.pick || draft.pick.status === "done") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.pickNotRunning,
      });
    }
    if (draft.pick.status !== "waiting") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.pickNotWaiting,
      });
    }
    const side = firstPickSide(draft.pick.firstPick ?? "toss", random);
    await tx
      .update(footballLineupDrafts)
      .set({ pickStatus: "live", firstPickSide: side, updatedAt: now })
      .where(eq(footballLineupDrafts.id, draft.id));
    return { ok: true as const, firstPickSide: side };
  });
}

export const startFootballPickProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return startFootballPick(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
