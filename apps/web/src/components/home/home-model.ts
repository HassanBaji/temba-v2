import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import type { HomeTarget } from "@repo/domain/home-next-game";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import { sportOrDefault, type Sport } from "@repo/domain/sport";

import { gameHomeIntentHref } from "~/lib/game-home-tab";
import type { RouterOutputs } from "~/trpc/react";

export type Slot<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export type HomeLevel =
  | { kind: "rated"; input: HomeLevelInput }
  | { kind: "none" };

type ApiRating = RouterOutputs["ratings"]["me"];

export function slotOf<T, U>(
  query: {
    data: T | undefined;
    error: { message: string } | null;
    isLoading: boolean;
  },
  map: (data: T) => U,
): Slot<U> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined || query.isLoading) {
    return { status: "loading" };
  }
  return { status: "ready", value: map(query.data) };
}

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

export function standingInSport(
  rows: readonly HomeStandingRow[],
  sport: Sport,
): HomeStandingRow[] {
  return rows.filter((row) => sportOrDefault(row.sport) === sport);
}

export function standingCountLabel(count: number): string {
  return `${count} ${count === 1 ? "group" : "groups"}`;
}

export function gameHref(target: HomeTarget): string {
  return target.intent
    ? gameHomeIntentHref(target.gameId, target.intent)
    : `/dashboard/games/${target.gameId}`;
}

export function createHref(action: HomeNoGamesCreateAction): string {
  return action.kind === "group"
    ? "/dashboard/groups/new"
    : "/dashboard/games/new";
}
