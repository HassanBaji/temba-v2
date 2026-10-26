import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import {
  deriveRecentForm,
  type RecentFormHistoryRow,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import { sportOrDefault, type Sport } from "@repo/domain/sport";

import type { RouterOutputs } from "../trpc/react";
import type { UpNextItem } from "./up-next-model";

export type Slot<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export type HomeLevel =
  | { kind: "rated"; input: HomeLevelInput }
  | { kind: "none" };

export type HomeModel = {
  name: string;
  imageUri: string | null;
  pendingInviteCount: number;
  upNext: Slot<UpNextItem[]>;
  noGamesAction: HomeNoGamesCreateAction;
  venueCounts: Record<Sport, number | null>;
  sport: Sport;
  level: Slot<HomeLevel>;
  recentForm: Slot<RecentFormView>;
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
      progressPercent: data.progressPercent,
    },
  };
}

export function noLevelCopy(sport: Sport): string {
  return `Play a rated ${sport} game and your ${sport} Level appears.`;
}

export function recentFormFromHistory(
  rows: readonly RecentFormHistoryRow[],
): RecentFormView {
  return deriveRecentForm(rows);
}

export function standingInSport(
  rows: readonly HomeStandingRow[],
  sport: Sport,
): HomeStandingRow[] {
  return rows.filter((row) => sportOrDefault(row.sport) === sport);
}

export function standingCountLabel(count: number): string {
  return `${count} ${count === 1 ? "group" : "groups"}`;
}

export function venueCountLabel(count: number | null): string | null {
  if (count == null) {
    return null;
  }
  if (count === 0) {
    return "No venues yet";
  }
  return `${count} ${count === 1 ? "venue" : "venues"}`;
}
