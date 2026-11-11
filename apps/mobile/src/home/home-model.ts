import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import {
  deriveRecentForm,
  type RecentFormHistoryRow,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import type { ProfileChecklist } from "@repo/domain/profile-checklist";
import { formatMonth } from "@repo/domain/format-game-start";
import {
  DEFAULT_SPORT,
  SPORTS,
  sportOrDefault,
  type Sport,
} from "@repo/domain/sport";
import { WIN_RATE_MIN_MATCHES } from "@repo/domain/win-rate";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";
import type { LatestMark } from "./latest-model";
import type { OpenWeekRow, UpNextItem } from "./up-next-model";

export type Slot<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export type HomeLevel =
  | { kind: "rated"; input: HomeLevelInput }
  | { kind: "none" };

/** The Profile checklist card: absent while loading or once every task is done. */
export type HomeChecklist = { list: ProfileChecklist; skipped: boolean };

export type HomeModel = {
  name: string;
  imageUri: string | null;
  pendingInviteCount: number;
  checklist: HomeChecklist | null;
  upNext: Slot<UpNextItem[]>;
  noGamesAction: HomeNoGamesCreateAction;
  openGames: OpenWeekRow[];
  latest: LatestMark | null;
  dateLine: string;
  sports: Sport[];
  sport: Sport;
  bands: Partial<Record<Sport, string | null>>;
  level: Slot<HomeLevel>;
  recentForm: Slot<RecentFormView>;
  stats: Slot<HomeStats | null>;
  standing: Slot<HomeStandingRow[]>;
};

type ApiRating = RouterOutputs["ratings"]["me"];

export function levelFromApi(data: ApiRating): HomeLevel {
  if (!data.rating) {
    return { kind: "none" };
  }
  return {
    kind: "rated",
    input: {
      band: data.rating.levelBand,
      level: data.rating.level,
      provisional: data.rating.provisional,
      ratedMatchesRemaining: data.rating.ratedMatchesRemaining,
      history: data.history,
      historyMatchCount: data.historyMatchCount,
      progressPercent: data.progressPercent,
    },
  };
}

export function noLevelCopy(sport: Sport, locale: Locale): string {
  return messagesFor(locale).mobileHome.level.noLevel[sport];
}

export function recentFormFromHistory(
  rows: readonly RecentFormHistoryRow[],
  locale: Locale,
): RecentFormView {
  return deriveRecentForm(rows, locale);
}

export function standingInSport(
  rows: readonly HomeStandingRow[],
  sport: Sport,
): HomeStandingRow[] {
  return rows.filter((row) => sportOrDefault(row.sport) === sport);
}

export function homeChecklist(
  list: ProfileChecklist | null,
  skipped: boolean,
): HomeChecklist | null {
  return list && !list.complete ? { list, skipped } : null;
}

/**
 * The sports Home shows: the ones on the User's profile. A User who has not
 * picked any yet sees both.
 */
export function homeSports(
  sports: readonly string[] | null | undefined,
): Sport[] {
  const picked = SPORTS.filter((sport) => sports?.includes(sport));
  return picked.length > 0 ? picked : [...SPORTS];
}

/** The chosen sport, else the sport of the next game, else the first one played. */
export function homeSport(
  chosen: Sport | null,
  sports: readonly Sport[],
  nextSport: Sport | null,
): Sport {
  if (chosen && sports.includes(chosen)) {
    return chosen;
  }
  if (nextSport && sports.includes(nextSport)) {
    return nextSport;
  }
  return sports[0] ?? DEFAULT_SPORT;
}

/** Groups where the User has counted games, and how many fold into one row. */
export function standingSplit(rows: readonly HomeStandingRow[]): {
  counted: HomeStandingRow[];
  uncounted: number;
  total: number;
} {
  const counted = rows.filter((row) => row.position != null);
  return {
    counted,
    uncounted: rows.length - counted.length,
    total: rows.length,
  };
}

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

type ApiProfile = RouterOutputs["users"]["myProfile"];

const MAX_DOTS = 8;

function dots(filled: number, total: number): StatMark {
  const shown = Math.min(MAX_DOTS, Math.max(total, filled, 1));
  return { kind: "dots", filled: Math.min(filled, shown), total: shown };
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round(Math.min(1, part / whole) * 100) : 0;
}

/** Three tiles for the sport: padel counts wins, football counts goals and clean sheets. */
export function statsFromProfile(
  profile: ApiProfile,
  locale: Locale,
): HomeStats | null {
  const { stats } = profile;
  if (stats.played === 0) {
    return null;
  }
  const m = messagesFor(locale).mobileHome.stats;
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
