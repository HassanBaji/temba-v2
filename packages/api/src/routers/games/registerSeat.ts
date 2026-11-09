import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, gameTeamPlayers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameNotFrozen,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  lockGameForAdmit,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { admit } from "#src/games/admit";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import {
  assertGameHasSeats,
  isIndividualSeatGame,
  occupySeat,
  remainingCapacity,
} from "#src/games/seats";
import type { SeatChoice } from "#src/games/utils";
import { userAllowedByLevelRange } from "#src/games/user-allowed-by-level-range";
import { enqueueWaitlistUser } from "#src/games/enqueue-waitlist-user";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registerSeat(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    sideIndex?: number;
    position?: SeatChoice;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  assertPoolDrawNotPosted(game, locale);
  const now = new Date();
  assertRegistrationOpen(game, now, locale);
  await assertGameNotFrozen(database, game, now, locale);

  if (isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.partnerRequired,
    });
  }

  assertGameHasSeats(game, locale);
  if (!isIndividualSeatGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.pickSeatIndividual,
    });
  }

  await assertUserPassesJoinGate(database, game, args.userId, locale);

  const existingPlayer = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, game.id),
      eq(gamePlayers.userId, args.userId),
    ),
  });
  if (existingPlayer) {
    const seated = await database.query.gameTeamPlayers.findFirst({
      where: eq(gameTeamPlayers.gamePlayerId, existingPlayer.id),
      columns: { id: true },
    });
    if (seated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).game.errors.alreadyRegistered,
      });
    }
    if (args.sideIndex == null || args.position == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.pickVacantPosition,
      });
    }
    const leftoverSideIndex = args.sideIndex;
    const leftoverPosition = args.position;
    await database.transaction(async (tx) => {
      await occupySeat(
        tx,
        await lockGameForAdmit(tx, game.id, locale),
        args.userId,
        leftoverSideIndex,
        leftoverPosition,
        existingPlayer.id,
        locale,
      );
    });
    return { ok: true as const, waitlisted: false as const };
  }

  if (await userAlreadyWaitlisted(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.alreadyWaitlisted,
    });
  }

  return database.transaction(async (tx) => {
    const locked = await lockGameForAdmit(tx, game.id, locale);
    if ((await remainingCapacity(tx, locked)) <= 0) {
      if (!(await userAllowedByLevelRange(tx, locked, args.userId))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: messagesFor(locale).level.rangeOutside,
        });
      }
      await enqueueWaitlistUser(tx, locked.id, args.userId);
      return { ok: true as const, waitlisted: true as const };
    }

    if (args.sideIndex == null || args.position == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.pickVacantPosition,
      });
    }
    throwIfAdmitRefused(
      await admit(tx, {
        game: locked,
        door: "register",
        party: {
          kind: "user",
          userId: args.userId,
          seat: { sideIndex: args.sideIndex, position: args.position },
        },
        now,
        locale,
      }),
      locale,
    );
    return { ok: true as const, waitlisted: false as const };
  });
}

export const registerSeatProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right", "either"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return registerSeat(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
      locale: ctx.locale,
    });
  });
