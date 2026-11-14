import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import {
  gamePaymentsTracked,
  type GamePaymentStatus,
  type PaymentLineupPlayer,
  type PaymentReminders,
  type PaymentTally,
  type ViewerPayment,
} from "@repo/domain/game-payments";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  loadPayers,
  paymentReminderAudience,
  type Payer,
  type PaymentSide,
} from "#src/game-payments/ledger";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type GamePaymentsManageRow = PaymentLineupPlayer & {
  status: GamePaymentStatus | null;
  claimedAt: Date | null;
  paidAt: Date | null;
  returnedAt: Date | null;
  /** Who made it paid; null unless the payment is paid. */
  paidBy: { isViewer: boolean; name: string | null } | null;
};

export type GamePayments =
  | { tracked: false }
  | {
      tracked: true;
      format: string;
      priceFils: number;
      keepersPlayFree: boolean;
      canManage: boolean;
      viewer: ViewerPayment | null;
      sides: PaymentSide[];
      /** What everyone sees of each other: the mark, nothing more. */
      players: PaymentLineupPlayer[];
      tally: PaymentTally;
      /** Amounts, times and who confirmed: the Organizer and Group admins only. */
      manage: {
        /** Every paid record, including one kept by a player who now plays free. */
        collectedFils: number;
        expectedFils: number;
        reminders: PaymentReminders;
        rows: GamePaymentsManageRow[];
      } | null;
    };

function tallyOf(payers: Payer[]): PaymentTally {
  const count = (mark: Payer["mark"]) =>
    payers.filter((payer) => payer.mark === mark).length;
  const paid = count("paid");
  const claimed = count("claimed");
  const due = count("due");
  return {
    paid,
    claimed,
    due,
    free: count("free"),
    payers: paid + claimed + due,
  };
}

export async function gamePaymentsForGame(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale; now?: Date },
): Promise<GamePayments> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  if (!gamePaymentsTracked(game) || game.pricePerPlayerFils == null) {
    return { tracked: false };
  }
  const priceFils = game.pricePerPlayerFils;
  const canManage = await isGameOrganizer(database, game, args.userId);
  const { payers, sides } = await loadPayers(database, game, now);
  const viewerRow = payers.find((row) => row.userId === args.userId);
  const players = payers.map((row) => ({
    userId: row.userId,
    name: row.name,
    image: row.image,
    isViewer: row.userId === args.userId,
    mark: row.mark,
    sideIndex: row.sideIndex,
    role: row.role,
    position: row.position,
  }));
  const tally = tallyOf(payers);

  async function manage() {
    const confirmerIds = [
      ...new Set(
        payers.flatMap((row) =>
          row.record?.status === "paid" && row.record.paidByUserId
            ? [row.record.paidByUserId]
            : [],
        ),
      ),
    ];
    const confirmers =
      confirmerIds.length === 0
        ? []
        : await database
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, confirmerIds));
    const confirmerName = new Map(confirmers.map((row) => [row.id, row.name]));
    const audience = await paymentReminderAudience(database, {
      gameId: game.id,
      payers,
      senderUserId: args.userId,
      now,
    });
    return {
      collectedFils:
        payers.filter((row) => row.record?.status === "paid").length *
        priceFils,
      expectedFils: tally.payers * priceFils,
      reminders: {
        toRemind: audience.toRemind.length,
        remindedToday: audience.remindedToday,
      },
      rows: payers.map((row, index) => {
        const paid = row.record?.status === "paid";
        const paidByUserId = paid ? (row.record?.paidByUserId ?? null) : null;
        return {
          ...players[index]!,
          status: row.record?.status ?? null,
          claimedAt: row.record?.claimedAt ?? null,
          paidAt: paid ? (row.record?.paidAt ?? null) : null,
          returnedAt: row.record?.returnedAt ?? null,
          paidBy: paid
            ? {
                isViewer: paidByUserId === args.userId,
                name: paidByUserId
                  ? (confirmerName.get(paidByUserId) ?? null)
                  : null,
              }
            : null,
        };
      }),
    };
  }

  return {
    tracked: true,
    format: game.format,
    priceFils,
    keepersPlayFree: game.keepersPlayFree,
    canManage,
    viewer: viewerRow
      ? {
          status: viewerRow.record?.status ?? null,
          free: viewerRow.free,
          claimedAt: viewerRow.record?.claimedAt ?? null,
          paidAt: viewerRow.record?.paidAt ?? null,
          returnedAt: viewerRow.record?.returnedAt ?? null,
          returnReason: viewerRow.record?.returnReason ?? null,
          returnNote: viewerRow.record?.returnNote ?? null,
        }
      : null,
    sides,
    players,
    tally,
    manage: canManage ? await manage() : null,
  };
}

export const forGameProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return gamePaymentsForGame(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
