import { intlLocale, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  preferredPositionProfileLine,
  type PreferredPosition,
} from "./preferred-position";
import { PRODUCT_TIMEZONE } from "./product-timezone";
import { isSport, type Sport } from "./sport";
import { formatWinRate } from "./win-rate";

export type PlayerOverallInput = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  setsWon: number;
  /** Scored Sets, a drawn Set included. */
  setsPlayed: number;
};

export type PlayerOverallTile = { label: string; value: string };

export type PlayerOverallView = {
  title: string;
  scope: string;
  tiles: PlayerOverallTile[];
};

export type PlayerStreaksInput = {
  current: number;
  best: number;
  bestReachedAt: Date | string | null;
};

export type PlayerStreaksView = {
  current: { headline: string; wonMarks: number };
  best: { headline: string; reachedIn: string | null };
};

export type PlayerPositionInput = {
  declared: PreferredPosition | null;
  recordedCount: number;
  leftCount: number;
  rightCount: number;
};

/** How one near-half side of the court diagram is drawn. */
export type CourtSideFill = "ink" | "paper" | "hatch";

export type PlayedSideView = {
  label: string;
  subtitle: string | null;
  court: { left: CourtSideFill; right: CourtSideFill };
};

/** At most this many won marks sit under the current Win streak. */
export const STREAK_MARKS_MAX = 10;

/** Fewer Matches with a recorded Position than this do not read as a habit. */
export const PLAYED_SIDE_MIN_MATCHES = 5;

export function playerProfileRefused(locale: Locale): {
  title: string;
  description: string;
} {
  const m = messagesFor(locale).profile.player;
  return { title: m.refusedTitle, description: m.refusedDescription };
}

/** Group member rows open Player profiles only for the Group's members. */
export function groupMemberRowsLink(membership: unknown) {
  return membership != null;
}

export function playerHeaderSubtitle(
  venue: { name: string } | null,
  locale: Locale,
  sport: Sport = "padel",
) {
  const m = messagesFor(locale);
  const label = m.common[sport];
  return venue ? m.profile.player.headerSubtitle(label, venue.name) : label;
}

/**
 * The sport a Player profile opens on: the one asked for, else padel unless
 * the player plays football only. Null until their Sports played are known.
 */
export function profileSport(
  requested: unknown,
  sports: readonly Sport[] | undefined,
): Sport | null {
  if (isSport(requested)) {
    return requested;
  }
  if (!sports) {
    return null;
  }
  return sports.includes("padel") ? "padel" : "football";
}

export function overallView(
  input: PlayerOverallInput,
  locale: Locale,
): PlayerOverallView {
  const m = messagesFor(locale).profile.player;
  return {
    title: m.overall,
    scope: m.allTime,
    tiles: [
      { label: m.matches, value: String(input.played) },
      { label: m.won, value: String(input.won) },
      { label: m.winRate, value: formatWinRate(input.won, input.played) },
      {
        label: m.setsWon,
        value: formatWinRate(input.setsWon, input.setsPlayed),
      },
    ],
  };
}

function monthAndYear(value: Date | string, locale: Locale) {
  return new Date(value).toLocaleDateString(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: PRODUCT_TIMEZONE,
  });
}

/** Only Win streaks show: a losing run reads as no current streak. */
export function streaksView(
  input: PlayerStreaksInput,
  locale: Locale,
): PlayerStreaksView {
  const m = messagesFor(locale).profile;
  return {
    current:
      input.current > 0
        ? {
            headline: m.player.winsInARow(input.current),
            wonMarks: Math.min(input.current, STREAK_MARKS_MAX),
          }
        : { headline: m.player.noCurrentStreak, wonMarks: 0 },
    best:
      input.best > 0
        ? {
            headline: m.wins(input.best),
            reachedIn: input.bestReachedAt
              ? monthAndYear(input.bestReachedAt, locale)
              : null,
          }
        : { headline: "—", reachedIn: null },
  };
}

function playedSideSubtitle(input: PlayerPositionInput, locale: Locale) {
  if (input.recordedCount < PLAYED_SIDE_MIN_MATCHES) {
    return null;
  }
  const m = messagesFor(locale).profile.player;
  const leftPercent = Math.round((100 * input.leftCount) / input.recordedCount);
  const rightPercent = 100 - leftPercent;
  if (input.declared === "left") {
    return m.playedLeft(leftPercent);
  }
  if (input.declared === "right") {
    return m.playedRight(rightPercent);
  }
  return m.playedBoth(leftPercent, rightPercent);
}

/**
 * The label is the declared Preferred Position; the subtitle is the Played
 * side. With no answer the near half is hatched ("not yet"). The far half is
 * never hatched, so it is not part of the view.
 */
export function playedSideView(
  input: PlayerPositionInput,
  locale: Locale,
): PlayedSideView {
  const declared = input.declared;
  const court: PlayedSideView["court"] =
    declared == null
      ? { left: "hatch", right: "hatch" }
      : {
          left: declared === "right" ? "paper" : "ink",
          right: declared === "left" ? "paper" : "ink",
        };
  return {
    label:
      preferredPositionProfileLine(declared, locale) ??
      messagesFor(locale).profile.player.noPreferenceSet,
    subtitle: playedSideSubtitle(input, locale),
    court,
  };
}
