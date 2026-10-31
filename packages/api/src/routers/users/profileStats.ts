import { and, eq, inArray, sum } from "drizzle-orm";
import { z } from "zod";

import { matchGoals, type DbClient } from "@repo/db";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot } from "@repo/domain/match-slots";
import type { Sport } from "@repo/domain/sport";
import { bestWinStreak } from "@repo/domain/win-streak";
import {
  summarizeCompletedMatchStats,
  type CompletedMatchForStats,
} from "@repo/domain/completed-matches";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";
import { sportSchema } from "@repo/validators/sport";

function byChronology(
  left: CompletedMatchForStats,
  right: CompletedMatchForStats,
) {
  const time = left.displayTime.getTime() - right.displayTime.getTime();
  if (time !== 0) {
    return time;
  }
  return left.createdAt.getTime() - right.createdAt.getTime();
}

function longestWinStreak(played: readonly CompletedMatchForStats[]) {
  const newestFirst = [...played].sort(byChronology).reverse();
  return bestWinStreak(
    newestFirst.map((match) => ({
      won:
        outcomeForSlot(match.userSlot, matchOutcome(match.sets).result) ===
        "won",
      playedAt: match.displayTime,
    })),
  ).count;
}

function mostPlayedPartner(
  played: readonly CompletedMatchForStats[],
  userId: string,
): { userId: string; name: string } | null {
  const partners = new Map<
    string,
    { userId: string; name: string; count: number; lastMatchAt: number }
  >();
  for (const match of played) {
    const teammates =
      match.userSlot === 1 ? match.slot1Players : match.slot2Players;
    for (const player of teammates) {
      if (player.userId === userId) {
        continue;
      }
      const at = match.displayTime.getTime();
      const existing = partners.get(player.userId);
      if (!existing) {
        partners.set(player.userId, {
          userId: player.userId,
          name: player.name,
          count: 1,
          lastMatchAt: at,
        });
        continue;
      }
      existing.count += 1;
      if (at >= existing.lastMatchAt) {
        existing.lastMatchAt = at;
        existing.name = player.name;
      }
    }
  }

  const ranked = [...partners.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (right.lastMatchAt !== left.lastMatchAt) {
      return right.lastMatchAt - left.lastMatchAt;
    }
    if (left.userId < right.userId) {
      return -1;
    }
    if (left.userId > right.userId) {
      return 1;
    }
    return 0;
  });
  const top = ranked[0];
  return top ? { userId: top.userId, name: top.name } : null;
}

function earliestMatchAt(played: readonly CompletedMatchForStats[]) {
  if (played.length === 0) {
    return null;
  }
  return [...played].sort(byChronology)[0]?.displayTime ?? null;
}

async function goalsScored(
  database: DbClient,
  userId: string,
  played: readonly CompletedMatchForStats[],
) {
  if (played.length === 0) {
    return 0;
  }
  const [row] = await database
    .select({ goals: sum(matchGoals.goals) })
    .from(matchGoals)
    .where(
      and(
        eq(matchGoals.userId, userId),
        inArray(
          matchGoals.matchId,
          played.map((match) => match.matchId),
        ),
      ),
    );
  return Number(row?.goals ?? 0);
}

/**
 * All-time numbers for the signed-in User's profile, in one sport or, when
 * none is asked for, across every sport. Goals are counted for football only.
 */
export async function loadProfileStats(
  database: DbClient,
  args: { userId: string; sport?: Sport },
) {
  const played = await loadCompletedMatchesForUser(
    database,
    args.userId,
    args.sport,
  );
  const summary = summarizeCompletedMatchStats(played);
  return {
    matchesPlayed: summary.gamesPlayed,
    matchesWon: summary.gamesWon,
    matchesLost: summary.gamesLost,
    matchesDrawn: summary.gamesPlayed - summary.gamesWon - summary.gamesLost,
    setsWon: summary.setsWon,
    setsLost: summary.setsLost,
    goalsScored:
      args.sport === "football"
        ? await goalsScored(database, args.userId, played)
        : 0,
    longestWinStreak: longestWinStreak(played),
    mostPlayedPartner: mostPlayedPartner(played, args.userId),
    firstMatchAt: earliestMatchAt(played),
  };
}

export const profileStats = protectedProcedure
  .input(z.object({ sport: sportSchema }).optional())
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadProfileStats(ctx.db, {
      userId: appUser.id,
      sport: input?.sport,
    });
  });
