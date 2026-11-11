import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameNotFrozen,
  assertRegistrationOpen,
  getRegistrationStatus,
  requireGame,
} from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import {
  assertGameHasSeats,
  isIndividualSeatGame,
  moveToSeat,
} from "#src/games/seats";
import type { SeatPosition } from "#src/games/utils";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function moveSeat(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    sideIndex: number;
    position: SeatPosition;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  assertPoolDrawNotPosted(game, locale);
  const now = new Date();

  if (isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.partnerRequired,
    });
  }

  assertGameHasSeats(game, args.locale ?? DEFAULT_LOCALE);
  if (!isIndividualSeatGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.moveSeatIndividual,
    });
  }

  assertRegistrationOpen(game, now, locale);
  await assertGameNotFrozen(database, game, now, args.locale);
  const status = await getRegistrationStatus(database, game, now);
  if (status === "full") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.noVacantPosition,
    });
  }

  await database.transaction(async (tx) => {
    await moveToSeat(
      tx,
      game,
      args.userId,
      args.sideIndex,
      args.position,
      locale,
    );
  });
  return { ok: true as const };
}

export const moveSeatProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      sideIndex: z.number().int().min(1),
      position: z.enum(["left", "right"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return moveSeat(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
      locale: ctx.locale,
    });
  });
