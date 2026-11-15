import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { pairRound, roundProblems } from "@repo/domain/tournament-pairing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertMakesPoolRounds,
  assertRoundInRange,
  assertRoundNotPosted,
  loadTournamentRoundContext,
  otherRounds,
  replaceRoundDraft,
  teamPoints,
} from "#src/games/tournament-round-context";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const POINTS_FROM_ROUND = 3;

/**
 * The Organizer's hand pairing of one Round: the pairings made so far are
 * the Round's draft, in Court order. `fill` asks Temba to pair the teams
 * still free around them.
 */
export async function saveRoundPairings(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    roundNumber: number;
    pairings: { slot1GameTeamId: string; slot2GameTeamId: string }[];
    fill: boolean;
    random?: () => number;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertMakesPoolRounds(game, locale);
  const context = await loadTournamentRoundContext(database, game);
  assertRoundInRange(context, args.roundNumber, locale);
  assertRoundNotPosted(context, args.roundNumber, locale);

  const [problem] = roundProblems({
    pools: context.pools,
    roundNumber: args.roundNumber,
    suggested: context.suggested,
    pairings: args.pairings,
    requireComplete: false,
  });
  if (problem) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        problem.kind === "pools_differ"
          ? messagesFor(locale).tournament.errors.samePool
          : problem.kind === "pool_sits_out"
            ? messagesFor(locale).tournament.errors.poolSitsOut
            : problem.kind === "team_twice"
              ? messagesFor(locale).tournament.errors.teamOncePerRound
              : messagesFor(locale).tournament.errors.teamNotInTournament,
    });
  }

  const pairings = args.fill
    ? pairRound({
        pools: context.pools,
        roundNumber: args.roundNumber,
        suggested: context.suggested,
        otherRounds: otherRounds(context, args.roundNumber),
        fixed: args.pairings,
        points:
          args.roundNumber >= POINTS_FROM_ROUND
            ? teamPoints(context)
            : undefined,
        random: args.random ?? Math.random,
      })
    : args.pairings;

  await database.transaction(async (tx) => {
    await replaceRoundDraft(tx, game.id, args.roundNumber, pairings);
  });

  return { pairings };
}

export const saveRoundPairingsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      roundNumber: z.number().int().min(1),
      pairings: z
        .array(
          z.object({
            slot1GameTeamId: z.string().uuid(),
            slot2GameTeamId: z.string().uuid(),
          }),
        )
        .max(64),
      fill: z.boolean().default(false),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveRoundPairings(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      roundNumber: input.roundNumber,
      pairings: input.pairings,
      fill: input.fill,
      locale: ctx.locale,
    });
  });
