import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import {
  gamePaymentEvents,
  gamePayments,
  gamePlayers,
  games,
  gameTeams,
  notifications,
} from "@repo/db";
import type {
  FootballBib,
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import {
  gamePaymentsTracked,
  paymentMark,
  type GamePaymentStatus,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { zonedParts } from "@repo/domain/product-timezone";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { requireGame, type GameRow } from "#src/games/access";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbOrTx = DbClient | DbTx;

export type PaymentRecord = typeof gamePayments.$inferSelect;

export type TrackedGame = GameRow & { pricePerPlayerFils: number };

export type Payer = {
  userId: string;
  name: string;
  image: string | null;
  role: FootballRole | null;
  position: FootballPosition | null;
  sideIndex: number | null;
  /** Has an account, so a Notification reaches them. */
  reachable: boolean;
  free: boolean;
  mark: PaymentMark;
  record: PaymentRecord | null;
};

export type PaymentSide = { sideIndex: number; bib: FootballBib | null };

function assertTracked(game: GameRow, locale: Locale): TrackedGame {
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

/** The Game, refused unless it tracks payments and is not cancelled. */
export async function requireTrackedGame(
  database: DbOrTx,
  gameId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<TrackedGame> {
  return assertTracked(await requireGame(database, gameId, locale), locale);
}

/**
 * The tracked Game with its row locked until the transaction ends, so two
 * changes to its payments run one after another and each reads the other's
 * result.
 */
export async function lockTrackedGame(
  tx: DbOrTx,
  gameId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<TrackedGame> {
  const [game] = await tx
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .for("update");
  if (!game) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  return assertTracked(game, locale);
}

/**
 * Whoever holds a keeper spot at kick-off owes nothing. Until kick-off the
 * rule follows the spot; from then on it is fixed, so taking or leaving the
 * gloves later changes nothing.
 */
export function playsFree(
  game: Pick<GameRow, "keepersPlayFree" | "windowStart">,
  player: {
    footballRole: FootballRole | null;
    kickoffFootballRole: FootballRole | null;
    createdAt: Date;
  },
  now: Date,
) {
  if (!game.keepersPlayFree) {
    return false;
  }
  const kickOff = game.windowStart;
  if (!kickOff || now.getTime() < kickOff.getTime()) {
    return player.footballRole === "keeper";
  }
  if (player.createdAt.getTime() > kickOff.getTime()) {
    return false;
  }
  return (player.kickoffFootballRole ?? player.footballRole) === "keeper";
}

/**
 * Everyone seated in the Game with their payment, and the Game's sides. A
 * record left by a player who has since left the Game is not listed; one
 * kept by a player who now plays free stays recorded and reads as free.
 */
export async function loadPayers(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "keepersPlayFree" | "windowStart">,
  now: Date,
): Promise<{ payers: Payer[]; sides: PaymentSide[] }> {
  const seated = await database.query.gamePlayers.findMany({
    where: and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.userId)),
    columns: {
      id: true,
      userId: true,
      footballRole: true,
      footballPosition: true,
      kickoffFootballRole: true,
      createdAt: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const teams = await database.query.gameTeams.findMany({
    where: and(eq(gameTeams.gameId, game.id), isNotNull(gameTeams.sideIndex)),
    columns: { sideIndex: true, bib: true },
    with: { players: { columns: { gamePlayerId: true } } },
  });
  const sideByGamePlayerId = new Map<string, number>();
  const sides: PaymentSide[] = [];
  for (const team of teams) {
    if (team.sideIndex == null) {
      continue;
    }
    sides.push({ sideIndex: team.sideIndex, bib: team.bib });
    for (const link of team.players) {
      sideByGamePlayerId.set(link.gamePlayerId, team.sideIndex);
    }
  }
  const records = await database.query.gamePayments.findMany({
    where: eq(gamePayments.gameId, game.id),
  });
  const recordByUserId = new Map(records.map((row) => [row.userId, row]));
  const payers = seated.flatMap((row) => {
    if (!row.userId || !row.user) {
      return [];
    }
    const record = recordByUserId.get(row.userId) ?? null;
    const free = playsFree(game, row, now);
    return [
      {
        userId: row.userId,
        name: row.user.name,
        image: row.user.image,
        role: row.footballRole,
        position: row.footballPosition,
        sideIndex: sideByGamePlayerId.get(row.id) ?? null,
        reachable: !isUnclaimed(row.user),
        free,
        mark: paymentMark(record?.status ?? null, free),
        record,
      },
    ];
  });
  return { payers, sides };
}

/**
 * The seated player a change is about. A player who plays free is refused
 * unless the change only settles a payment they already have on record.
 */
export async function requirePayer(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "keepersPlayFree" | "windowStart">,
  userId: string,
  options: { now: Date; locale?: Locale; allowFree?: boolean },
): Promise<Payer> {
  const { payers } = await loadPayers(database, game, options.now);
  const payer = payers.find((row) => row.userId === userId);
  const errors = messagesFor(options.locale ?? DEFAULT_LOCALE).gamePayments
    .errors;
  if (!payer) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPlayer });
  }
  if (payer.free && !options.allowFree) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.nothingToPay });
  }
  return payer;
}

type PaymentEventAction = (typeof gamePaymentEvents.$inferInsert)["action"];

type PaymentChange = {
  gameId: string;
  userId: string;
  actorUserId: string;
  action: PaymentEventAction;
  now: Date;
};

async function recordEvent(database: DbOrTx, change: PaymentChange) {
  await database.insert(gamePaymentEvents).values({
    gameId: change.gameId,
    userId: change.userId,
    actorUserId: change.actorUserId,
    action: change.action,
    createdAt: change.now,
  });
}

/** Writes one player's payment and the event that says who changed it. */
export async function writePayment(
  database: DbOrTx,
  change: PaymentChange & {
    status: GamePaymentStatus;
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
    status: change.status,
    ...change.fields,
    updatedByUserId: change.actorUserId,
    updatedAt: change.now,
  };
  await database
    .insert(gamePayments)
    .values({ gameId: change.gameId, userId: change.userId, ...values })
    .onConflictDoUpdate({
      target: [gamePayments.gameId, gamePayments.userId],
      set: values,
    });
  await recordEvent(database, change);
}

/**
 * Back to not paid: the row goes, so nothing stale is read as a claim, and
 * the event keeps who took it back.
 */
export async function clearPayment(database: DbOrTx, change: PaymentChange) {
  await database
    .delete(gamePayments)
    .where(
      and(
        eq(gamePayments.gameId, change.gameId),
        eq(gamePayments.userId, change.userId),
      ),
    );
  await recordEvent(database, change);
}

/** One reminder a day per Game reaches a player, however often it is sent. */
export function paymentReminderDedupeKey(gameId: string, now: Date) {
  const day = zonedParts(now);
  return `game_payment_reminder:${gameId}:${day.year}-${day.month}-${day.day}`;
}

/**
 * Who a reminder sent now would reach: players not paid, other than the
 * sender, with an account, who have not been reminded today.
 */
export async function paymentReminderAudience(
  database: DbOrTx,
  args: { gameId: string; payers: Payer[]; senderUserId: string; now: Date },
) {
  const due = args.payers.filter(
    (payer) =>
      payer.mark === "due" &&
      payer.reachable &&
      payer.userId !== args.senderUserId,
  );
  if (due.length === 0) {
    return { toRemind: [], remindedToday: 0 };
  }
  const reminded = await database
    .select({ userId: notifications.recipientUserId })
    .from(notifications)
    .where(
      and(
        eq(
          notifications.dedupeKey,
          paymentReminderDedupeKey(args.gameId, args.now),
        ),
        inArray(
          notifications.recipientUserId,
          due.map((payer) => payer.userId),
        ),
      ),
    );
  const remindedIds = new Set(reminded.map((row) => row.userId));
  return {
    toRemind: due.filter((payer) => !remindedIds.has(payer.userId)),
    remindedToday: remindedIds.size,
  };
}
