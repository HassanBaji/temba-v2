import { z } from "zod";

import {
  generateRounds as pairRounds,
  roundRepeats,
} from "@repo/domain/tournament-pairing";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertMakesPoolRounds,
  loadTournamentRoundContext,
  madeRounds,
  replaceRoundDraft,
  teamPoints,
} from "#src/games/tournament-round-context";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type GenerateRoundsScope = "all" | "rest" | "next";

// From Round 3 on, a Round made on its own pairs teams on similar points.
const POINTS_FROM_ROUND = 3;

/**
 * Drafts Pool Rounds for the Organizer. `all` re-makes every Round not yet
 * posted, `rest` makes only the Rounds with no draft, and `next` makes the
 * first Round with neither. Randomness is the server's, as for the draw.
 */
export async function generateRounds(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    scope: GenerateRoundsScope;
    random?: () => number;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  assertMakesPoolRounds(game);
  const context = await loadTournamentRoundContext(database, game);

  const made = madeRounds(context);
  const kept = made.filter((round) => !round.draft || args.scope !== "all");
  const keptNumbers = new Set(kept.map((round) => round.roundNumber));
  const open = Array.from(
    { length: context.roundCount },
    (_, index) => index + 1,
  ).filter((roundNumber) => !keptNumbers.has(roundNumber));
  const targets = args.scope === "next" ? open.slice(0, 1) : open;
  if (targets.length === 0) {
    return { roundNumbers: [] as number[], repeats: [] };
  }

  const usesPoints =
    args.scope === "next" && (targets[0] ?? 0) >= POINTS_FROM_ROUND;
  const generated = pairRounds({
    pools: context.pools,
    suggested: context.suggested,
    roundCount: context.roundCount,
    roundNumbers: targets,
    madeRounds: kept,
    points: usesPoints ? teamPoints(context) : undefined,
    random: args.random ?? Math.random,
  });

  await database.transaction(async (tx) => {
    for (const round of generated) {
      await replaceRoundDraft(tx, game.id, round.roundNumber, round.pairings);
    }
  });

  return {
    roundNumbers: generated.map((round) => round.roundNumber),
    repeats: roundRepeats([...kept, ...generated], context.suggested),
  };
}

export const generateRoundsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      scope: z.enum(["all", "rest", "next"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return generateRounds(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      scope: input.scope,
    });
  });
