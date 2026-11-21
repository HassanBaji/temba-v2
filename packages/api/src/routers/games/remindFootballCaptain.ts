import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { notifications } from "@repo/db";
import type { Side } from "@repo/domain/football-board";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  assertFootballDraftOpen,
  loadFootballDraft,
} from "#src/games/football-draft";
import {
  footballPickReminderDedupeKey,
  notifyFootballPickReminder,
} from "#src/notifications/notify-football-draft";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A Side captain reminds the other side's captain that the Pick room waits
 * for them, or an Organizer reminds the captain of either side (ADR-0109).
 * One reminder per five minutes reaches them; a second press inside the
 * window succeeds and sends nothing, and `sent` says which it was.
 */
export async function remindFootballCaptain(
  database: DbClient,
  args: { gameId: string; userId: string; side: Side; locale?: Locale },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale);
  const game = await requireGame(database, args.gameId, locale);
  await assertFootballDraftOpen(database, game, locale);

  return database.transaction(async (tx) => {
    const draft = await loadFootballDraft(tx, game, args.userId, {
      lock: true,
    });
    if (!draft) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.game.errors.notFound,
      });
    }
    if (!draft.pick || draft.pick.status === "done") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.football.errors.pickNotRunning,
      });
    }
    const recipient =
      args.side === 1 ? draft.captains.slot1 : draft.captains.slot2;
    const mayRemind =
      draft.viewer.sideCaptainOf != null
        ? draft.viewer.sideCaptainOf !== args.side
        : draft.viewer.organizer;
    if (!mayRemind || recipient == null || recipient === args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: m.football.errors.pickRemindOtherSide,
      });
    }

    const [already] = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, recipient),
          eq(
            notifications.dedupeKey,
            footballPickReminderDedupeKey(game.id, now),
          ),
        ),
      );
    if (already) {
      return { sent: false as const };
    }
    await notifyFootballPickReminder(tx, {
      gameId: game.id,
      sideCaptainUserId: recipient,
      remindedBy: args.userId,
      now,
    });
    return { sent: true as const };
  });
}

export const remindFootballCaptainProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      side: z.union([z.literal(1), z.literal(2)]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return remindFootballCaptain(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
