import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import type { HomeTarget } from "@repo/domain/home-next-game";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
      history: data.history,
      historySteps: data.historySteps,
      historyMatchCount: data.historyMatchCount,
    },
  };
}

export function noLevelCopy(sport: Sport, locale: Locale): string {
  return messagesFor(locale).webAuth.home.noLevel[sport];
}

export function standingInSport(
  rows: readonly HomeStandingRow[],
  sport: Sport,
): HomeStandingRow[] {
  return rows.filter((row) => sportOrDefault(row.sport) === sport);
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

/** Google Maps directions to a Venue by name and city; it opens the maps app on phones. */
export function directionsHref(venue: { name: string; city: string }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${venue.name}, ${venue.city}`,
  )}`;
}
