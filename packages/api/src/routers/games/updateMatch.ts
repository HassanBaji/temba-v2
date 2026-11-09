import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
import { updateFriendlyGameMatchCourt } from "#src/games/update-friendly-game-match-court";
import { updateTournamentMatch } from "#src/games/update-tournament-match";
import { type MatchUpdateInput } from "#src/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function hasTimesOrSlots(input: MatchUpdateInput) {
  return (
    input.startTime !== undefined ||
    input.endTime !== undefined ||
    input.durationInMinutes !== undefined ||
    input.slot1GameTeamId !== undefined ||
    input.slot2GameTeamId !== undefined
  );
}

export async function updateGameMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
  input: MatchUpdateInput,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.format === "friendly_game") {
    if (hasTimesOrSlots(input)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.friendlyNoTimes,
      });
    }
    await updateFriendlyGameMatchCourt(
      database,
      game,
      matchId,
      input.courtId ?? null,
      locale,
    );
    return;
  }

  await updateTournamentMatch(database, game, matchId, input, locale);
}

export async function updateMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    matchId: string;
    startTime?: Date | null;
    endTime?: Date | null;
    durationInMinutes?: number | null;
    courtId?: string | null;
    slot1GameTeamId?: string | null;
    slot2GameTeamId?: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await database.transaction(async (tx) => {
    await updateGameMatch(
      tx,
      game,
      args.matchId,
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
  return { ok: true as const };
}

export const updateMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
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
    return updateMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      matchId: input.matchId,
      startTime: input.startTime,
      endTime: input.endTime,
      durationInMinutes: input.durationInMinutes,
      courtId: input.courtId,
      slot1GameTeamId: input.slot1GameTeamId,
      slot2GameTeamId: input.slot2GameTeamId,
      locale: ctx.locale,
    });
  });
