import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { matches } from "@repo/db";

import { hasKnockout } from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";
import { applyMatchSides } from "#src/games/helpers/apply-match-sides";
import { matchTimes } from "#src/games/helpers/match-times";
import { type TournamentMatchInput } from "#src/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addTournamentMatch(
  database: Tx,
  game: GameRow,
  input: TournamentMatchInput,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.addMatchCancelled,
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.addMatchesFriendly,
    });
  }
  if (hasKnockout(game.format, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.knockoutByHand,
    });
  }
  await applyMatchSides(database, game.id, input, locale);
  const values = matchTimes(input);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      ...values,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Match",
    });
  }
  return match;
}

export async function addMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    startTime: Date | null;
    endTime: Date | null;
    durationInMinutes: number | null;
    courtId: string | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  return database.transaction(async (tx) => {
    return addTournamentMatch(
      tx,
      game,
      {
        startTime: args.startTime,
        endTime: args.endTime,
        durationInMinutes: args.durationInMinutes,
        courtId: args.courtId,
        slot1GameTeamId: args.slot1GameTeamId,
        slot2GameTeamId: args.slot2GameTeamId,
      },
      locale,
    );
  });
}

export const addMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      startTime: z.coerce.date().nullable().optional(),
      endTime: z.coerce.date().nullable().optional(),
      durationInMinutes: z.number().int().nonnegative().nullable().optional(),
      courtId: z.string().uuid().nullable().optional(),
      slot1GameTeamId: z.string().uuid().nullable().optional(),
      slot2GameTeamId: z.string().uuid().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      durationInMinutes: input.durationInMinutes ?? null,
      courtId: input.courtId ?? null,
      slot1GameTeamId: input.slot1GameTeamId ?? null,
      slot2GameTeamId: input.slot2GameTeamId ?? null,
      locale: ctx.locale,
    });
  });
