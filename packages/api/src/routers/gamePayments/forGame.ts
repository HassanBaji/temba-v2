import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  gamePaymentsTracked,
  paymentTally,
  type PaymentMark,
  type PaymentTally,
  type ViewerPayment,
} from "@repo/domain/game-payments";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import { loadPayers } from "#src/game-payments/payers";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type GamePaymentsPlayer = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
  mark: PaymentMark;
};

export type GamePaymentsManageRow = GamePaymentsPlayer & {
  status: ViewerPayment["status"];
  claimedAt: Date | null;
  paidAt: Date | null;
  returnedAt: Date | null;
};

export type GamePayments =
  | { tracked: false }
  | {
      tracked: true;
      priceFils: number;
      keepersPlayFree: boolean;
      canManage: boolean;
      viewer: ViewerPayment | null;
      /** What everyone sees of each other: the mark, nothing more. */
      players: GamePaymentsPlayer[];
      tally: PaymentTally;
      /** Only for the Organizer and Group admins. */
      manage: GamePaymentsManageRow[] | null;
    };

export async function gamePaymentsForGame(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
): Promise<GamePayments> {
  const locale = args.locale ?? DEFAULT_LOCALE;
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
  const canManage = await isGameOrganizer(database, game, args.userId);
  const payers = await loadPayers(database, game);
  const viewerRow = payers.find((row) => row.userId === args.userId);
  const players = payers.map((row) => ({
    userId: row.userId,
    name: row.name,
    image: row.image,
    isViewer: row.userId === args.userId,
    mark: row.mark,
  }));
  return {
    tracked: true,
    priceFils: game.pricePerPlayerFils,
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
    players,
    tally: paymentTally(
      payers.map((row) => row.mark),
      game.pricePerPlayerFils,
    ),
    manage: canManage
      ? payers.map((row, index) => ({
          ...players[index]!,
          status: row.record?.status ?? null,
          claimedAt: row.record?.claimedAt ?? null,
          paidAt: row.record?.paidAt ?? null,
          returnedAt: row.record?.returnedAt ?? null,
        }))
      : null,
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
