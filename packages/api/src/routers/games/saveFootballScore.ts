import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gameTeamPlayers,
  matchGoals,
  matchSets,
} from "@repo/db";

import {
  FOOTBALL_GOALS_MAX,
  FOOTBALL_GOALS_MIN,
  footballBibName,
  footballScorersProblem,
} from "@repo/domain/football-lineup";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import {
  FOOTBALL_SCORE_SET_NUMBER,
  assertFootballGame,
  assertGameNotCancelled,
  footballMatch,
  footballScoreOpen,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";
import {
  clearMatchResultConfirmationsExceptUser,
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function refuse(code: "BAD_REQUEST" | "FORBIDDEN", message: string): never {
  throw new TRPCError({ code, message });
}

async function sideUserIds(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: {},
    with: { gamePlayer: { columns: { userId: true } } },
  });
  return new Set(
    links.flatMap((link) =>
      link.gamePlayer.userId ? [link.gamePlayer.userId] : [],
    ),
  );
}

/**
 * Saves a football Match's Score (stored as its one Set, goals as games won)
 * and, optionally, who scored. A player on either side or an Organizer may
 * enter it once the Game has kicked off. The player who enters a Score
 * confirms it for their side; a changed Score asks the other side again.
 */
export async function saveFootballScore(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    slot1Goals: number;
    slot2Goals: number;
    scorers: { userId: string; goals: number }[];
  },
  now: Date = new Date(),
) {
  const game = await requireGame(database, args.gameId);
  assertFootballGame(game);
  assertGameNotCancelled(game);
  const match = await footballMatch(database, game.id);
  const sides = await footballSides(database, game.id);
  if (!match || !sides.slot1 || !sides.slot2) {
    refuse("BAD_REQUEST", "Publish the teams before entering a score");
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    refuse("FORBIDDEN", "This score is confirmed; it can no longer change");
  }
  if (!footballScoreOpen(game, now)) {
    refuse("FORBIDDEN", "The score opens at kick-off");
  }

  const [slot1Users, slot2Users] = await Promise.all([
    sideUserIds(database, sides.slot1.id),
    sideUserIds(database, sides.slot2.id),
  ]);
  const onSide = slot1Users.has(args.userId) || slot2Users.has(args.userId);
  if (!onSide && !(await isGameOrganizer(database, game, args.userId))) {
    refuse(
      "FORBIDDEN",
      "Only the organizer or players on the teams can enter the score",
    );
  }

  const scorerIds = args.scorers.map((scorer) => scorer.userId);
  if (new Set(scorerIds).size !== scorerIds.length) {
    refuse("BAD_REQUEST", "Name each scorer once");
  }
  const named = { slot1: 0, slot2: 0 };
  for (const scorer of args.scorers) {
    if (slot1Users.has(scorer.userId)) {
      named.slot1 += scorer.goals;
    } else if (slot2Users.has(scorer.userId)) {
      named.slot2 += scorer.goals;
    } else {
      refuse("BAD_REQUEST", "Scorers must be on one of the teams");
    }
  }
  const scorersProblem = footballScorersProblem(
    { slot1: args.slot1Goals, slot2: args.slot2Goals },
    named,
    {
      slot1: footballBibName(sides.slot1.bib, 1),
      slot2: footballBibName(sides.slot2.bib, 2),
    },
  );
  if (scorersProblem) {
    refuse("BAD_REQUEST", scorersProblem);
  }

  const existing = await footballScoreSet(database, match.id);
  const scoreChanged =
    existing?.slot1GamesWon !== args.slot1Goals ||
    existing.slot2GamesWon !== args.slot2Goals;

  await database.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(matchSets)
        .set({
          slot1GamesWon: args.slot1Goals,
          slot2GamesWon: args.slot2Goals,
          updatedAt: now,
        })
        .where(eq(matchSets.id, existing.id));
    } else {
      await tx.insert(matchSets).values({
        matchId: match.id,
        setNumber: FOOTBALL_SCORE_SET_NUMBER,
        slot1GamesWon: args.slot1Goals,
        slot2GamesWon: args.slot2Goals,
      });
    }
    await tx.delete(matchGoals).where(eq(matchGoals.matchId, match.id));
    const scored = args.scorers.filter((scorer) => scorer.goals > 0);
    if (scored.length > 0) {
      await tx.insert(matchGoals).values(
        scored.map((scorer) => ({
          matchId: match.id,
          userId: scorer.userId,
          goals: scorer.goals,
        })),
      );
    }
    if (scoreChanged) {
      await clearMatchResultConfirmationsExceptUser(tx, match.id, args.userId);
    }
    if (onSide) {
      await recordMatchResultConfirmation(tx, match.id, args.userId);
    }
  });

  if (await matchResultFullyConfirmed(database, match)) {
    await runMatchCompletionEffect(database, game, match.id);
  }
  return { ok: true as const };
}

export const saveFootballScoreProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      slot1Goals: z
        .number()
        .int()
        .min(FOOTBALL_GOALS_MIN)
        .max(FOOTBALL_GOALS_MAX),
      slot2Goals: z
        .number()
        .int()
        .min(FOOTBALL_GOALS_MIN)
        .max(FOOTBALL_GOALS_MAX),
      scorers: z
        .array(
          z.object({
            userId: z.string().uuid(),
            goals: z.number().int().min(1).max(FOOTBALL_GOALS_MAX),
          }),
        )
        .max(40),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveFootballScore(ctx.db, { ...input, userId: appUser.id });
  });
