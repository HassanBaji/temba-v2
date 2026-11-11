import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatMonth } from "./format-game-start";
import { WIN_RATE_MIN_MATCHES } from "./win-rate";

export type StatMark =
  | { kind: "bar"; percent: number }
  | { kind: "dots"; filled: number; total: number };

export type StatTile = {
  key: string;
  label: string;
  value: string;
  caption: string;
  mark: StatMark;
};

export type HomeStats = { meta: string; tiles: StatTile[] };

/** What Home reads from `users.myProfile` for one sport. */
export type HomeStatsInput = {
  stats: {
    played: number;
    winRatePercent: number | null;
    run: { outcome: string; count: number } | null;
    longestStreak: { count: number; reachedAt: Date | string | null } | null;
  };
  football: {
    goals: number;
    cleanSheets: number;
    unbeaten: { current: number; best: number };
  } | null;
};

const MAX_DOTS = 8;

function dots(filled: number, total: number): StatMark {
  const shown = Math.min(MAX_DOTS, Math.max(total, filled, 1));
  return { kind: "dots", filled: Math.min(filled, shown), total: shown };
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round(Math.min(1, part / whole) * 100) : 0;
}

/** Three tiles for the sport: padel counts wins, football counts goals and clean sheets. */
export function homeStats(
  profile: HomeStatsInput,
  locale: Locale,
): HomeStats | null {
  const { stats } = profile;
  if (stats.played === 0) {
    return null;
  }
  const m = messagesFor(locale).home.stats;
  const meta = m.matches(stats.played);
  const best = stats.longestStreak?.count ?? 0;

  if (profile.football) {
    const { goals, cleanSheets, unbeaten } = profile.football;
    const perGame = goals / stats.played;
    return {
      meta,
      tiles: [
        {
          key: "goals",
          label: m.goals,
          value: String(goals),
          caption: m.perGame(perGame.toFixed(1)),
          mark: { kind: "bar", percent: share(perGame, 1) },
        },
        {
          key: "clean-sheets",
          label: m.cleanSheets,
          value: String(cleanSheets),
          caption: m.ofMatches(stats.played),
          mark: { kind: "bar", percent: share(cleanSheets, stats.played) },
        },
        {
          key: "unbeaten",
          label: m.unbeaten,
          value: String(unbeaten.current),
          caption: m.bestIs(unbeaten.best),
          mark: dots(unbeaten.current, unbeaten.best),
        },
      ],
    };
  }

  const current = stats.run?.outcome === "won" ? stats.run.count : 0;
  const reachedAt = stats.longestStreak?.reachedAt;
  return {
    meta,
    tiles: [
      {
        key: "win-rate",
        label: m.winRate,
        value: stats.winRatePercent == null ? "—" : `${stats.winRatePercent}%`,
        caption:
          stats.winRatePercent == null
            ? m.winRateAfter(WIN_RATE_MIN_MATCHES)
            : m.played(stats.played),
        mark: { kind: "bar", percent: stats.winRatePercent ?? 0 },
      },
      {
        key: "wins-in-a-row",
        label: m.winsInARow,
        value: String(current),
        caption: m.bestIs(best),
        mark: dots(current, best),
      },
      {
        key: "best-run",
        label: m.bestRun,
        value: String(best),
        caption: reachedAt
          ? m.winsIn(formatMonth(reachedAt, "long", locale))
          : m.wins,
        mark: dots(best, best),
      },
    ],
  };
}
