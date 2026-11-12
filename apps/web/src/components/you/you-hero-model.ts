import { formatMonth } from "@repo/domain/format-game-start";
import { bandFromLevel, formatPadelLevel } from "@repo/domain/level";
import { zonedParts } from "@repo/domain/product-timezone";
import { WIN_RATE_MIN_MATCHES } from "@repo/domain/win-rate";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "~/trpc/react";

import { arrowLevel, bandInText, displayBand, monthYear } from "./you-format";

export type MyProfile = RouterOutputs["users"]["myProfile"];
export type ScopeLevel = NonNullable<MyProfile["level"]>;

const BAND_WIDTH = 0.7;

export type HeroStat = { value: string; label: string };

export type HeroView = {
  label: string;
  status: string;
  band: string;
  rating: string;
  ring: { percent: number; label: string };
  move: string | null;
  outlook: string;
  spoken: string;
};

function ringFor(level: ScopeLevel, ratedCount: number, locale: Locale) {
  const m = messagesFor(locale).you.hero;
  if (level.provisional) {
    const total = ratedCount + level.ratedMatchesRemaining;
    return {
      percent: total === 0 ? 0 : Math.round((ratedCount / total) * 100),
      label: m.toConfirm(ratedCount, total),
    };
  }
  return {
    percent: level.progressPercent,
    label: m.percentThrough(level.progressPercent),
  };
}

function generalOutlook(level: ScopeLevel, locale: Locale) {
  const m = messagesFor(locale).you.hero;
  if (level.provisional) {
    return m.settles(level.ratedMatchesRemaining);
  }
  if (level.nextBand === null || level.distanceToNext === null) {
    return m.topBand;
  }
  const toNext = m.toNext(
    level.distanceToNext.toFixed(2),
    bandInText(displayBand(level.nextBand), locale),
  );
  return level.winsToNext === null
    ? toNext
    : `${toNext} ${m.winsToNext(level.winsToNext)}`;
}

/** The ink hero: the Temba Level. */
export function heroView(
  args: { level: ScopeLevel; ratedMatchCount: number },
  locale: Locale,
): HeroView {
  const m = messagesFor(locale).you.hero;
  const { level, ratedMatchCount: ratedCount } = args;
  const band = displayBand(level.levelBand);
  const rating = formatPadelLevel(level.rating, 2);
  const status = level.provisional
    ? m.provisionalRated(ratedCount)
    : m.confirmed(ratedCount);
  const move =
    level.weekDelta !== null && level.weekDelta !== 0
      ? m.thisWeek(arrowLevel(level.weekDelta))
      : null;

  return {
    label: m.generalLevel,
    status,
    band,
    rating,
    ring: ringFor(level, ratedCount, locale),
    move,
    outlook: generalOutlook(level, locale),
    spoken: m.spoken(bandInText(band, locale), rating, status),
  };
}

export function heroStats(
  stats: MyProfile["stats"],
  locale: Locale,
): HeroStat[] {
  const m = messagesFor(locale).you.hero;
  const none = messagesFor(locale).webYou.noData;
  const winRate: HeroStat =
    stats.winRatePercent === null
      ? { value: none, label: m.winRateAfter(WIN_RATE_MIN_MATCHES) }
      : { value: `${stats.winRatePercent}%`, label: m.winRate };
  const matches: HeroStat = { value: String(stats.played), label: m.matches };
  const run = stats.run;
  return [
    winRate,
    matches,
    {
      value: run
        ? run.outcome === "won"
          ? m.streakWon(run.count)
          : m.streakLost(run.count)
        : none,
      label: m.streak,
    },
  ];
}

export type CurvePoint = { x: number; y: number };

export type RatingCurve = {
  /** SVG `points`, in a 300 by 100 box. */
  points: string;
  dot: CurvePoint;
  gridlines: { y: number; label: string }[];
};

export const CURVE_WIDTH = 300;
export const CURVE_HEIGHT = 100;

function hundredth(value: number) {
  return Math.round(value * 100) / 100;
}

function bandFloor(value: number) {
  return hundredth(Math.floor(value / BAND_WIDTH + 1e-9) * BAND_WIDTH);
}

function bandCeil(value: number) {
  return hundredth(Math.ceil(value / BAND_WIDTH - 1e-9) * BAND_WIDTH);
}

/** The band boundaries around a set of Levels, at least one band apart. */
export function bandRange(values: readonly number[]) {
  const low = bandFloor(Math.min(...values));
  let high = bandCeil(Math.max(...values));
  if (high - low < BAND_WIDTH - 1e-9) {
    high = hundredth(low + BAND_WIDTH);
  }
  return { low, high };
}

/** Each band boundary in the range, labelled with the band that starts there. */
export function bandTicks(low: number, high: number) {
  const ticks: { value: number; label: string }[] = [];
  for (let value = low; value <= high + 1e-9; value += BAND_WIDTH) {
    const rounded = hundredth(value);
    ticks.push({
      value: rounded,
      label: displayBand(bandFromLevel(rounded + 0.001)),
    });
  }
  return ticks;
}

/**
 * The rating curve, oldest to latest. Time runs with the reading direction,
 * so in Arabic the latest point is on the left.
 */
export function ratingCurve(
  levels: readonly number[],
  options: { rtl: boolean },
): RatingCurve | null {
  if (levels.length === 0) {
    return null;
  }
  const { low, high } = bandRange(levels);
  const y = (value: number) =>
    Math.round(
      (CURVE_HEIGHT - ((value - low) / (high - low)) * CURVE_HEIGHT) * 10,
    ) / 10;
  const x = (index: number) => {
    const forward =
      levels.length === 1
        ? CURVE_WIDTH
        : (index / (levels.length - 1)) * CURVE_WIDTH;
    return (
      Math.round((options.rtl ? CURVE_WIDTH - forward : forward) * 10) / 10
    );
  };
  const coords = levels.map((value, index) => ({ x: x(index), y: y(value) }));
  const last = coords[coords.length - 1]!;
  return {
    points: coords.map((point) => `${point.x},${point.y}`).join(" "),
    dot: last,
    gridlines: bandTicks(low, high)
      .reverse()
      .map((tick) => ({ y: y(tick.value), label: tick.label })),
  };
}

/** "Rating, last 24 rated" and "Mar to Nov" over the curve. */
export function curveCaption(history: ScopeLevel["history"], locale: Locale) {
  const m = messagesFor(locale).you.hero;
  const dated = history.flatMap((point) => (point.at ? [point.at] : []));
  const first = dated[0];
  const last = dated[dated.length - 1];
  return {
    title: m.graphTitle(dated.length),
    span: first && last ? m.graphSpan(...monthSpan(first, last, locale)) : null,
  };
}

function monthSpan(
  first: Date | string,
  last: Date | string,
  locale: Locale,
): [string, string] {
  const sameYear =
    zonedParts(new Date(first)).year === zonedParts(new Date(last)).year;
  return sameYear
    ? [formatMonth(first, "short", locale), formatMonth(last, "short", locale)]
    : [monthYear(first, locale), monthYear(last, locale)];
}
