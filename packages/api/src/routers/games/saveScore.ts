import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  matchScoreChanges,
  matchSets,
  matches,
} from "@repo/db";

import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "@repo/domain/friendly-game-results";
import { isPublicGame } from "@repo/domain/game-rating-scope";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  SCORE_CHANGE_REASONS,
  type ScoreChangeReason,
} from "@repo/domain/score-review";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertMayWriteSets } from "#src/games/assert-may-write-sets";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import {
  notifyOtherSideOfScore,
  settleConfirmationsAfterSetChange,
} from "#src/games/confirmations-after-set-change";
import { lockMatch } from "#src/games/lock-rows";
import { requireMatchOnGame } from "#src/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type ScoreToSave = {
  setId: string;
  slot1GamesWon: number;
  slot2GamesWon: number;
};

/**
 * Saves a padel Match's Sets in one call, so the score is entered or changed
 * as a whole and never confirmed half-way through (ADR-0115). Whoever saves
 * it is confirmed, which confirms their side, and every other confirmation
 * goes. Changing a score that already had a result keeps what it replaced
 * and the optional reason, and asks the other side to confirm the new one.
 * Sets left out keep their games. The same score saved again changes
 * nothing, except on a Public Game, where it agrees with the score
 * (ADR-0071).
 */
export async function saveScore(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    userId: string;
    sets: ScoreToSave[];
    reason?: ScoreChangeReason | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).game.errors;
  for (const set of args.sets) {
    for (const gamesWon of [set.slot1GamesWon, set.slot2GamesWon]) {
      if (
        gamesWon < FRIENDLY_SET_GAMES_MIN ||
        gamesWon > FRIENDLY_SET_GAMES_MAX
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errors.gamesInSetBetween(
            FRIENDLY_SET_GAMES_MIN,
            FRIENDLY_SET_GAMES_MAX,
          ),
        });
      }
    }
  }
  const game = await requireGame(database, args.gameId, locale);
  const match = await requireMatchOnGame(
    database,
    game.id,
    args.matchId,
    locale,
  );
  const organizer = await isGameOrganizer(database, game, args.userId);

  return database.transaction(async (tx) => {
    const locked = await lockMatch(tx, match.id, locale);
    await assertMayWriteSets(tx, game, locked, args.userId, organizer, locale);
    if (!(await bothSlottedTeamsComplete(tx, locked))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: errors.scoreNeedsTeams,
      });
    }
    const stored = await tx.query.matchSets.findMany({
      where: eq(matchSets.matchId, locked.id),
      orderBy: asc(matchSets.setNumber),
    });
    const storedById = new Map(stored.map((set) => [set.id, set]));
    const toSave = new Map(args.sets.map((set) => [set.setId, set]));
    if (
      toSave.size !== args.sets.length ||
      args.sets.some((set) => !storedById.has(set.setId))
    ) {
      throw new TRPCError({ code: "NOT_FOUND", message: errors.setNotFound });
    }

    const changed = args.sets.filter((set) => {
      const before = storedById.get(set.setId);
      return (
        before?.slot1GamesWon !== set.slot1GamesWon ||
        before.slot2GamesWon !== set.slot2GamesWon
      );
    });
    const now = new Date();
    for (const set of changed) {
      await tx
        .update(matchSets)
        .set({
          slot1GamesWon: set.slot1GamesWon,
          slot2GamesWon: set.slot2GamesWon,
          updatedAt: now,
        })
        .where(eq(matchSets.id, set.setId));
    }
    const scoreChanged = changed.length > 0;
    await settleConfirmationsAfterSetChange(tx, {
      game,
      match: locked,
      userId: args.userId,
      scoreChanged,
    });

    const replacedAResult =
      scoreChanged && matchOutcome(stored).result !== "none";
    if (replacedAResult) {
      await tx.insert(matchScoreChanges).values({
        matchId: locked.id,
        changedByUserId: args.userId,
        reason: args.reason ?? null,
        previousSets: stored.map((set) => ({
          setNumber: set.setNumber,
          slot1GamesWon: set.slot1GamesWon,
          slot2GamesWon: set.slot2GamesWon,
        })),
        createdAt: now,
      });
      const after = await tx.query.matches.findFirst({
        where: eq(matches.id, locked.id),
        columns: { status: true },
      });
      // A Public Game's changed score already asked them, with its 24 hours.
      if (after?.status === MatchStatusEnum.PENDING && !isPublicGame(game)) {
        await notifyOtherSideOfScore(tx, {
          game,
          match: locked,
          userId: args.userId,
        });
      }
    }
    return { ok: true as const, changed: scoreChanged };
  });
}

export const saveScoreProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      sets: z
        .array(
          z.object({
            setId: z.string().uuid(),
            slot1GamesWon: z
              .number()
              .int()
              .min(FRIENDLY_SET_GAMES_MIN)
              .max(FRIENDLY_SET_GAMES_MAX),
            slot2GamesWon: z
              .number()
              .int()
              .min(FRIENDLY_SET_GAMES_MIN)
              .max(FRIENDLY_SET_GAMES_MAX),
          }),
        )
        .min(1)
        .max(5),
      reason: z.enum(SCORE_CHANGE_REASONS).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveScore(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
