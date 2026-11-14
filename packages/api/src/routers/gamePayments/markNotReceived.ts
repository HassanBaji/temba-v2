import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  GAME_PAYMENT_NOTE_MAX_LENGTH,
  GAME_PAYMENT_RETURN_REASONS,
  type GamePaymentReturnReason,
} from "@repo/domain/game-payments";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import {
  lockTrackedGame,
  requirePayer,
  writePayment,
} from "#src/game-payments/ledger";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer or a Group admin sends a claim back: the player is not paid,
 * and sees the reason or note on the Game.
 */
export async function markPaymentNotReceived(
  database: DbClient,
  args: {
    gameId: string;
    actorUserId: string;
    playerUserId: string;
    reason?: GamePaymentReturnReason | null;
    note?: string | null;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const trimmed = args.note?.trim() ?? "";
  const note = trimmed === "" ? null : trimmed;
  await database.transaction(async (tx) => {
    const game = await lockTrackedGame(tx, args.gameId, locale);
    await assertGameOrganizer(tx, game, args.actorUserId, locale);
    const payer = await requirePayer(tx, game, args.playerUserId, {
      now,
      locale,
      allowFree: true,
    });
    if (payer.record?.status !== "claimed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).gamePayments.errors.notClaimed,
      });
    }
    await writePayment(tx, {
      gameId: game.id,
      userId: args.playerUserId,
      actorUserId: args.actorUserId,
      action: "not_received",
      status: "not_received",
      now,
      fields: {
        returnedAt: now,
        returnedByUserId: args.actorUserId,
        returnReason: args.reason ?? null,
        returnNote: note,
      },
    });
    await notify(tx, {
      type: "game_payment_not_received",
      recipients: [{ userId: args.playerUserId, audience: "player" }],
      excludeUserIds: [args.actorUserId],
      actorUserId: args.actorUserId,
      gameId: game.id,
      groupId: game.groupId,
    });
  });
  return { status: "not_received" as const };
}

export const markNotReceivedProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      userId: z.string().uuid(),
      reason: z.enum(GAME_PAYMENT_RETURN_REASONS).nullable().optional(),
      note: z
        .string()
        .trim()
        .max(GAME_PAYMENT_NOTE_MAX_LENGTH)
        .nullable()
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markPaymentNotReceived(ctx.db, {
      gameId: input.gameId,
      actorUserId: appUser.id,
      playerUserId: input.userId,
      reason: input.reason,
      note: input.note,
      locale: ctx.locale,
    });
  });
