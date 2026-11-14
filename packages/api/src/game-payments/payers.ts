import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { gamePayments, gamePlayers } from "@repo/db";
import {
  gamePaymentsTracked,
  paymentMark,
  playsFree,
  type GamePaymentStatus,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { requireGame, type GameRow } from "#src/games/access";

type DbOrTx = DbClient | DbTx;

export type PaymentRecord = typeof gamePayments.$inferSelect;

export type Payer = {
  userId: string;
  name: string;
  image: string | null;
  footballRole: string | null;
  free: boolean;
  mark: PaymentMark;
  record: PaymentRecord | null;
};

/** The Game, refused unless it tracks payments and is not cancelled. */
export async function requireTrackedGame(
  database: DbOrTx,
  gameId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<GameRow & { pricePerPlayerFils: number }> {
  const game = await requireGame(database, gameId, locale);
  if (!gamePaymentsTracked(game) || game.pricePerPlayerFils == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).gamePayments.errors.notTracked,
    });
  }
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.cancelled,
    });
  }
  return { ...game, pricePerPlayerFils: game.pricePerPlayerFils };
}

/**
 * Everyone seated in the Game with their payment. A record left by a player
 * who has since left the Game is not listed; one kept by a player who now
 * plays free stays recorded but reads as free.
 */
export async function loadPayers(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "keepersPlayFree">,
): Promise<Payer[]> {
  const seated = await database.query.gamePlayers.findMany({
    where: and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.userId)),
    columns: { userId: true, footballRole: true },
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const records = await database.query.gamePayments.findMany({
    where: eq(gamePayments.gameId, game.id),
  });
  const recordByUserId = new Map(records.map((row) => [row.userId, row]));
  return seated.flatMap((row) => {
    if (!row.userId || !row.user) {
      return [];
    }
    const record = recordByUserId.get(row.userId) ?? null;
    const free = playsFree(game, row);
    return [
      {
        userId: row.userId,
        name: row.user.name,
        image: row.user.image,
        footballRole: row.footballRole,
        free,
        mark: paymentMark(record?.status ?? null, free),
        record,
      },
    ];
  });
}

export async function requirePayer(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "keepersPlayFree">,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<Payer> {
  const payer = (await loadPayers(database, game)).find(
    (row) => row.userId === userId,
  );
  const errors = messagesFor(locale).gamePayments.errors;
  if (!payer) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPlayer });
  }
  if (payer.free) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.nothingToPay });
  }
  return payer;
}

/** Writes one player's payment, recording who made the change. */
export async function writePayment(
  database: DbOrTx,
  args: {
    gameId: string;
    userId: string;
    actorUserId: string;
    status: GamePaymentStatus;
    now: Date;
    fields?: Partial<
      Pick<
        PaymentRecord,
        | "claimedAt"
        | "paidAt"
        | "paidByUserId"
        | "returnedAt"
        | "returnedByUserId"
        | "returnReason"
        | "returnNote"
      >
    >;
  },
) {
  const values = {
    status: args.status,
    ...args.fields,
    updatedByUserId: args.actorUserId,
    updatedAt: args.now,
  };
  await database
    .insert(gamePayments)
    .values({ gameId: args.gameId, userId: args.userId, ...values })
    .onConflictDoUpdate({
      target: [gamePayments.gameId, gamePayments.userId],
      set: values,
    });
}

/** Back to not paid: the row goes, so nothing stale is read as a claim. */
export async function clearPayment(
  database: DbOrTx,
  args: { gameId: string; userId: string },
) {
  await database
    .delete(gamePayments)
    .where(
      and(
        eq(gamePayments.gameId, args.gameId),
        eq(gamePayments.userId, args.userId),
      ),
    );
}
