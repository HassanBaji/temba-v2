import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import {
  deriveRecentForm,
  type RecentFormHistoryRow,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import type { ProfileChecklist } from "@repo/domain/profile-checklist";
import type { SportSwitchLevel } from "@repo/domain/ratings-screen";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";
import {
  latestMark,
  latestSeriesWin,
  latestUpdate,
  type Latest,
  type LatestCabinet,
  type LatestSeriesWins,
} from "@repo/domain/home-latest";
import type { HomeStats } from "@repo/domain/home-stats";
import type { OpenWeekRow } from "@repo/domain/home-open-week";

import type { HomeNavTarget } from "./home-target";
import type { UpNextItem } from "./up-next-model";

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
  unreadNotificationCount: number;
  checklist: HomeChecklist | null;
  upNext: Slot<UpNextItem[]>;
  noGamesAction: HomeNoGamesCreateAction;
  openGames: OpenWeekRow[];
  latest: Latest | null;
  dateLine: string;
  sports: Sport[];
  sport: Sport;
  levels: Partial<Record<Sport, SportSwitchLevel | null>>;
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
      sport: data.face === "ovr" ? "football" : "padel",
      face: data.face,
      levelValue: data.levelValue,
      rating: {
        levelBand: data.rating.levelBand,
        provisional: data.rating.provisional,
        ratedMatchesRemaining: data.rating.ratedMatchesRemaining,
      },
      ratedMatchCount: data.ratedMatchCount,
      changeOverLast: data.changeOverLast,
      lastMatch: data.lastMatch,
      history: data.history,
      historySteps: data.historySteps,
      historyMatchCount: data.historyMatchCount,
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
 * Home's Latest row: the newer of the newest Mark and Series win, each while
 * it is at most 14 days old, unless this device has opened it already.
 */
export function homeLatest(
  input: {
    cabinet: LatestCabinet | undefined;
    seriesWins: LatestSeriesWins | undefined;
    sports: readonly Sport[];
    seen: string | null;
    now: Date;
  },
  locale: Locale,
): Latest | null {
  const newest = latestUpdate(
    latestMark(input.cabinet, input.sports, input.now, locale),
    latestSeriesWin(input.seriesWins, input.now, locale),
  );
  return newest && newest.key !== input.seen ? newest : null;
}

/** A Mark opens Latest on the User's marks; a Series win opens its Game. */
export function latestTarget(latest: Latest, userId: string): HomeNavTarget {
  return latest.type === "series"
    ? { kind: "game", gameId: latest.gameId }
    : { kind: "marks", userId, sport: latest.sport };
}
