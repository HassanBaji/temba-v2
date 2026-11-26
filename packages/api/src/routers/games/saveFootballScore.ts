import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gameTeamPlayers,
  games,
  matchEvents,
  matchGoals,
  matchSets,
} from "@repo/db";
import { isPublicGame } from "@repo/domain/game-rating-scope";
import { squadsReadyForScore } from "@repo/domain/matchday-squad";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  FOOTBALL_GOALS_MAX,
  FOOTBALL_GOALS_MIN,
  footballBibName,
  footballScorersProblem,
} from "@repo/domain/football-lineup";
import {
  MATCH_LOG_KINDS,
  MATCH_LOG_LINES_MAX,
  MATCH_LOG_MINUTE_MAX,
  MATCH_LOG_MINUTE_MIN,
  RED_CARD_REASONS,
  logScore,
  logScorers,
  matchLogProblem,
  sameLog,
  type MatchLogPayloadLine,
} from "@repo/domain/football-match-log";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame, type GameRow } from "#src/games/access";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { loadMatchLog } from "#src/games/football-match-log";
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
  askOtherSideToConfirm,
  keepPublicGameConfirmation,
} from "#src/games/confirmations-after-set-change";
import {
  clearMatchResultConfirmationsExceptUser,
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import {
  runMatchCompletionEffect,
  standUnconfirmedIfConfirmWindowClosed,
} from "#src/games/run-match-completion-effect";

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

function sameScorers(
  stored: readonly { userId: string; goals: number }[],
  next: readonly { userId: string; goals: number }[],
) {
  const goalsOf = (rows: readonly { userId: string; goals: number }[]) =>
    new Map(
      rows.filter((row) => row.goals > 0).map((row) => [row.userId, row.goals]),
    );
  const before = goalsOf(stored);
  const after = goalsOf(next);
  return (
    before.size === after.size &&
    [...after].every(([userId, goals]) => before.get(userId) === goals)
  );
}

type ScoreArgs = {
  gameId: string;
  userId: string;
  slot1Goals: number;
  slot2Goals: number;
  scorers: { userId: string; goals: number }[];
  /**
   * The Match log, oldest first. Without it the stored log is kept while the
   * Score and scorers stay the same, and dropped once they change.
   */
  log?: MatchLogPayloadLine[];
  locale?: Locale;
};

async function checkAndWriteScore(
  database: DbClient,
  game: GameRow,
  args: ScoreArgs,
  now: Date,
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  assertFootballGame(game, locale);
  assertGameNotCancelled(game, locale);
  const match = await footballMatch(database, game.id);
  const sides = await footballSides(database, game.id);
  if (!match || !sides.slot1 || !sides.slot2) {
    refuse(
      "BAD_REQUEST",
      messagesFor(locale).football.errors.publishTeamsFirst,
    );
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    refuse("FORBIDDEN", messagesFor(locale).football.errors.scoreLocked);
  }
  const challengeSides = await loadChallengeSides(database, game);
  if (
    challengeSides &&
    !squadsReadyForScore(challengeSides.map((side) => side.squadState))
  ) {
    refuse("BAD_REQUEST", messagesFor(locale).challenge.errors.nameBothSquads);
  }
  if (!footballScoreOpen(game, now)) {
    refuse(
      "FORBIDDEN",
      messagesFor(locale).football.errors.scoreOpensAtKickOff,
    );
  }

  const [slot1Users, slot2Users] = await Promise.all([
    sideUserIds(database, sides.slot1.id),
    sideUserIds(database, sides.slot2.id),
  ]);
  const onSide = slot1Users.has(args.userId) || slot2Users.has(args.userId);
  if (!onSide && !(await isGameOrganizer(database, game, args.userId))) {
    refuse(
      "FORBIDDEN",
      messagesFor(locale).football.errors.scoreOrganizerOrPlayers,
    );
  }

  const scorerIds = args.scorers.map((scorer) => scorer.userId);
  if (new Set(scorerIds).size !== scorerIds.length) {
    refuse("BAD_REQUEST", messagesFor(locale).football.errors.scorerOnce);
  }
  const named = { slot1: 0, slot2: 0 };
  for (const scorer of args.scorers) {
    if (slot1Users.has(scorer.userId)) {
      named.slot1 += scorer.goals;
    } else if (slot2Users.has(scorer.userId)) {
      named.slot2 += scorer.goals;
    } else {
      refuse("BAD_REQUEST", messagesFor(locale).football.errors.scorersOnTeams);
    }
  }
  const scorersProblem = footballScorersProblem(
    { slot1: args.slot1Goals, slot2: args.slot2Goals },
    named,
    {
      slot1: footballBibName(sides.slot1.bib, 1, locale),
      slot2: footballBibName(sides.slot2.bib, 2, locale),
    },
    locale,
  );
  if (scorersProblem) {
    refuse("BAD_REQUEST", scorersProblem);
  }
  if (args.log) {
    const sideOf = (userId: string) =>
      slot1Users.has(userId) ? 1 : slot2Users.has(userId) ? 2 : null;
    const logProblem = matchLogProblem(args.log, sideOf, locale);
    if (logProblem) {
      refuse("BAD_REQUEST", logProblem);
    }
    const logged = logScore(args.log);
    if (logged.slot1 !== args.slot1Goals || logged.slot2 !== args.slot2Goals) {
      refuse(
        "BAD_REQUEST",
        messagesFor(locale).football.matchLog.errors.logMatchesScore,
      );
    }
    if (!sameScorers(logScorers(args.log), args.scorers)) {
      refuse(
        "BAD_REQUEST",
        messagesFor(locale).football.matchLog.errors.logMatchesScorers,
      );
    }
  }

  const existing = await footballScoreSet(database, match.id);
  const scoreChanged =
    existing?.slot1GamesWon !== args.slot1Goals ||
    existing.slot2GamesWon !== args.slot2Goals;
  // Goals feed OVR (ADR-0069), so who scored is part of what both sides agree.
  const scorersChanged = !sameScorers(
    await database.query.matchGoals.findMany({
      where: eq(matchGoals.matchId, match.id),
      columns: { userId: true, goals: true },
    }),
    args.scorers,
  );
  // The log and its cards are confirmed with the Score.
  const logBefore = await loadMatchLog(database, match.id);
  const nextLog = args.log ?? (scoreChanged || scorersChanged ? [] : logBefore);
  const logChanged = !sameLog(logBefore, nextLog);

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
    if (logChanged) {
      await tx.delete(matchEvents).where(eq(matchEvents.matchId, match.id));
      if (nextLog.length > 0) {
        await tx.insert(matchEvents).values(
          nextLog.map((line, position) => ({
            matchId: match.id,
            kind: line.kind,
            sideIndex: line.side,
            userId: line.userId,
            minute: line.minute,
            loggedAt: line.loggedAt,
            reason: line.reason,
            position,
          })),
        );
      }
    }
    const changed = scoreChanged || scorersChanged || logChanged;
    if (changed) {
      await clearMatchResultConfirmationsExceptUser(tx, match.id, args.userId);
    }
    if (isPublicGame(game)) {
      // The enterer is confirmed and the other side's 24 hours start; the
      // same Score saved again moves neither, and after the 24 hours lets
      // the Score stand without counting (ADR-0071).
      if (changed) {
        await recordMatchResultConfirmation(tx, match.id, args.userId);
        await askOtherSideToConfirm(tx, { game, match, userId: args.userId });
      } else if (
        !(await standUnconfirmedIfConfirmWindowClosed(
          tx,
          game,
          match.id,
          now,
        )) &&
        onSide
      ) {
        await keepPublicGameConfirmation(tx, {
          game,
          match,
          userId: args.userId,
        });
      }
    } else if (onSide) {
      await recordMatchResultConfirmation(tx, match.id, args.userId);
    }
  });
  return match;
}

/**
 * Saves a football Match's Score (stored as its one Set, goals as games won)
 * and, optionally, who scored and the Match log of goals, own goals and
 * cards, which must add up to the Score and its scorers. A player on either side or an Organizer may
 * enter it once the Game has kicked off. The player who enters a Score
 * confirms it for their side; a changed Score, list of who scored or Match
 * log asks the other side again. On a Public Game that also restarts the
 * other side's 24 hours to confirm.
 * On a Challenge Game the Game row is locked first, as `nameChallengeSquad`
 * locks it, so a squad save and a first Score cannot both pass their checks.
 */
export async function saveFootballScore(
  database: DbClient,
  args: ScoreArgs,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE,
) {
  const game = await requireGame(database, args.gameId, locale);
  const match = game.challengeId
    ? await database.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(games)
          .where(eq(games.id, game.id))
          .for("update");
        return checkAndWriteScore(tx, locked ?? game, args, now);
      })
    : await checkAndWriteScore(database, game, args, now);

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
      log: z
        .array(
          z.object({
            kind: z.enum(MATCH_LOG_KINDS),
            side: z.union([z.literal(1), z.literal(2)]),
            userId: z.string().uuid().nullable(),
            minute: z
              .number()
              .int()
              .min(MATCH_LOG_MINUTE_MIN)
              .max(MATCH_LOG_MINUTE_MAX),
            loggedAt: z.date(),
            reason: z.enum(RED_CARD_REASONS).nullable(),
          }),
        )
        .max(MATCH_LOG_LINES_MAX)
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return saveFootballScore(
      ctx.db,
      {
        ...input,
        userId: appUser.id,
        locale: ctx.locale,
      },
      undefined,
      ctx.locale,
    );
  });
