import { APP_LOCALE } from "./format-game-start";
import {
  preferredPositionProfileLine,
  type PreferredPosition,
} from "./preferred-position";
import { PRODUCT_TIMEZONE } from "./product-timezone";
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

export const PLAYER_PROFILE_REFUSED = {
  title: "This profile isn't available",
  description: "You can see people you share a Group or a Game with.",
} as const;

/** Group member rows open Player profiles only for the Group's members. */
export function groupMemberRowsLink(membership: unknown) {
  return membership != null;
}

export function playerHeaderSubtitle(venue: { name: string } | null) {
  return venue ? `Padel, plays at ${venue.name}` : "Padel";
}

export function overallView(input: PlayerOverallInput): PlayerOverallView {
  return {
    title: "Overall",
    scope: "All time",
    tiles: [
      { label: "Matches", value: String(input.played) },
      { label: "Won", value: String(input.won) },
      { label: "Win rate", value: formatWinRate(input.won, input.played) },
      {
        label: "Sets won",
        value: formatWinRate(input.setsWon, input.setsPlayed),
      },
    ],
  };
}

function wins(count: number) {
  return count === 1 ? "1 win" : `${count} wins`;
}

function monthAndYear(value: Date | string) {
  return new Date(value).toLocaleDateString(APP_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: PRODUCT_TIMEZONE,
  });
}

/** Only Win streaks show: a losing run reads as no current streak. */
export function streaksView(input: PlayerStreaksInput): PlayerStreaksView {
  return {
    current:
      input.current > 0
        ? {
            headline: `${wins(input.current)} in a row`,
            wonMarks: Math.min(input.current, STREAK_MARKS_MAX),
          }
        : { headline: "No current streak", wonMarks: 0 },
    best:
      input.best > 0
        ? {
            headline: wins(input.best),
            reachedIn: input.bestReachedAt
              ? monthAndYear(input.bestReachedAt)
              : null,
          }
        : { headline: "—", reachedIn: null },
  };
}

function playedSideSubtitle(input: PlayerPositionInput) {
  if (input.recordedCount < PLAYED_SIDE_MIN_MATCHES) {
    return null;
  }
  const leftPercent = Math.round((100 * input.leftCount) / input.recordedCount);
  const rightPercent = 100 - leftPercent;
  if (input.declared === "left") {
    return `Played left in ${leftPercent}% of matches`;
  }
  if (input.declared === "right") {
    return `Played right in ${rightPercent}% of matches`;
  }
  return `Left ${leftPercent}%, right ${rightPercent}% of matches`;
}

/**
 * The label is the declared Preferred Position; the subtitle is the Played
 * side. With no answer the near half is hatched ("not yet"). The far half is
 * never hatched, so it is not part of the view.
 */
export function playedSideView(input: PlayerPositionInput): PlayedSideView {
  const declared = input.declared;
  const court: PlayedSideView["court"] =
    declared == null
      ? { left: "hatch", right: "hatch" }
      : {
          left: declared === "right" ? "paper" : "ink",
          right: declared === "left" ? "paper" : "ink",
        };
  return {
    label: preferredPositionProfileLine(declared) ?? "No preference set",
    subtitle: playedSideSubtitle(input),
    court,
  };
}
