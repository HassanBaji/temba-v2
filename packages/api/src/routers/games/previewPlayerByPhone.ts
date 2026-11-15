import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyOnGame: boolean;
  phoneMasked?: string;
};

export async function previewPlayerByPhone(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    countryIso: string;
    nationalNumber: string;
    locale?: Locale;
  },
): Promise<PhonePlayerPreview> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertOrganizerAddFormat(game, locale);
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber, locale);

  const resolved = await resolvePhonePlayer(database, phoneNumber);
  if (resolved.kind === "new") {
    return { kind: "new", name: null, alreadyOnGame: false };
  }
  const alreadyOnGame = await userAlreadyOnGame(
    database,
    game.id,
    resolved.user.id,
  );
  if (resolved.kind === "account") {
    return { kind: "account", name: resolved.user.name, alreadyOnGame };
  }
  return {
    kind: "unclaimed",
    name: resolved.user.name,
    alreadyOnGame,
    phoneMasked: maskPhone(phoneNumber),
  };
}

export const previewPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
    }),
  )
  .query(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.phonePreview, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return previewPlayerByPhone(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      countryIso: input.countryIso,
      nationalNumber: input.nationalNumber,
      locale: ctx.locale,
    });
  });
