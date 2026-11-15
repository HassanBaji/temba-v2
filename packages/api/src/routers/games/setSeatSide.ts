import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { gameFrozenReason, requireGame } from "#src/games/access";
import { changeOwnSide, type SeatChoice } from "#src/games/seats";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A seated User picks Left, Right or Either for themselves before the Game. */
export async function setSeatSide(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    side: SeatChoice;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (game.format !== "friendly_game" || game.sport === "football") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sidesPadelFriendly,
    });
  }
  if (await gameFrozenReason(database, game, args.now ?? new Date())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.sidesUntilStart,
    });
  }
  await database.transaction(async (tx) => {
    const { movedPartnerUserId } = await changeOwnSide(
      tx,
      game,
      args.userId,
      args.side,
      locale,
    );
    if (movedPartnerUserId) {
      await notify(tx, {
        type: "game_side_changed",
        recipients: [{ userId: movedPartnerUserId, audience: "player" }],
        excludeUserIds: [args.userId],
        actorUserId: args.userId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }
  });
  return { ok: true as const };
}

export const setSeatSideProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      side: z.enum(["left", "right", "either"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setSeatSide(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      side: input.side,
      locale: ctx.locale,
    });
  });
