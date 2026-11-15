import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertUserPassesJoinGate,
  lockGameForAdmit,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { admit } from "#src/games/admit";
import { assertCanRegisterWithPartner } from "#src/games/helpers/assert-can-register-with-partner";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import {
  assertFullyVacantSide,
  firstFullyVacantSideIndex,
  remainingCapacity,
} from "#src/games/seats";
import { userAllowedByLevelRange } from "#src/games/user-allowed-by-level-range";
import type { SeatPosition } from "#src/games/utils";
import {
  isPartnerRequiredGame,
  PARTNER_REQUIRED_FULL_MESSAGE,
} from "@repo/domain/tournament-rounds";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registerWithPartner(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    partnerUserId: string;
    sideIndex?: number;
    position?: SeatPosition;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  assertPoolDrawNotPosted(game, locale);
  const now = new Date();
  await assertCanRegisterWithPartner(database, game, args.userId, now, locale);

  const partner = await database.query.user.findFirst({
    where: eq(user.id, args.partnerUserId),
    columns: { id: true },
  });
  if (!partner) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).profile.errors.userNotFound,
    });
  }
  if (partner.id === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.registerWithSelf,
    });
  }
  await assertUserPassesJoinGate(database, game, partner.id, locale);

  if (await userAlreadyOnGame(database, game.id, partner.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.userAlreadyRegistered,
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, partner.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.userWaitlisted,
    });
  }

  if (!(await userAllowedByLevelRange(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).level.rangeOutside,
    });
  }
  if (!(await userAllowedByLevelRange(database, game, partner.id))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).level.rangePartner,
    });
  }

  await database.transaction(async (tx) => {
    const locked = await lockGameForAdmit(tx, game.id, locale);
    const remaining = await remainingCapacity(tx, locked);
    // A pair is never waitlisted: the partner did not ask to wait, and
    // promotion would seat them one at a time.
    if (remaining <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: isPartnerRequiredGame(locked)
          ? PARTNER_REQUIRED_FULL_MESSAGE
          : messagesFor(locale).game.errors.partnerWaitlist,
      });
    }
    if (remaining < 2) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.notEnoughSeats,
      });
    }

    const vacantSide = await firstFullyVacantSideIndex(tx, locked);
    if (vacantSide == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.noVacantSide,
      });
    }
    if (args.sideIndex == null || args.position == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.pickVacantSideAndPosition,
      });
    }
    const sideIndex = args.sideIndex;
    await assertFullyVacantSide(tx, locked, sideIndex, locale);

    throwIfAdmitRefused(
      await admit(tx, {
        game: locked,
        door: "register",
        party: {
          kind: "pair",
          userIds: [args.userId, partner.id],
          sideIndex,
          callerPosition: args.position,
        },
        now,
        locale,
      }),
      locale,
      "pair",
    );
  });

  return { ok: true as const, waitlisted: false as const };
}

export const registerWithPartnerProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      partnerUserId: z.string().uuid(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return registerWithPartner(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      partnerUserId: input.partnerUserId,
      sideIndex: input.sideIndex,
      position: input.position,
      locale: ctx.locale,
    });
  });
