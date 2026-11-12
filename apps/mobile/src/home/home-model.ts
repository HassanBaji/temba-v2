import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import {
  deriveRecentForm,
  type RecentFormHistoryRow,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import type { ProfileChecklist } from "@repo/domain/profile-checklist";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";
import type { LatestMark } from "@repo/domain/home-latest";
import type { HomeStats } from "@repo/domain/home-stats";
import type { OpenWeekRow } from "@repo/domain/home-open-week";

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
      sport: data.face === "ovr" ? "football" : "padel",
      ovr: data.ovr,
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
