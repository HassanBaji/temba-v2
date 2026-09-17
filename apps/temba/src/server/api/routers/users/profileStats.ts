import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  loadCompletedMatchesForUser,
  summarizeCompletedMatchStats,
  type CompletedMatchForStats,
} from "~/server/stats/completed-matches";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

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
  const ordered = [...played].sort(byChronology);
  let longest = 0;
  let current = 0;
  for (const match of ordered) {
    const result = matchOutcome(match.sets).result;
    const won = match.userSlot === 1 ? result === "slot1" : result === "slot2";
    if (won) {
      current += 1;
      if (current > longest) {
        longest = current;
      }
    } else {
      current = 0;
    }
  }
  return longest;
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

export async function loadProfileStats(
  database: DbClient,
  args: { userId: string },
) {
  const played = await loadCompletedMatchesForUser(database, args.userId);
  const summary = summarizeCompletedMatchStats(played);
  return {
    matchesPlayed: summary.gamesPlayed,
    matchesWon: summary.gamesWon,
    matchesLost: summary.gamesLost,
    setsWon: summary.setsWon,
    setsLost: summary.setsLost,
    longestWinStreak: longestWinStreak(played),
    mostPlayedPartner: mostPlayedPartner(played, args.userId),
    firstMatchAt: earliestMatchAt(played),
  };
}

export const profileStats = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadProfileStats(ctx.db, { userId: appUser.id });
});
