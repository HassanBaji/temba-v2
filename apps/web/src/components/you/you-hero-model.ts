import { formatDayMonth, formatMonth } from "@repo/domain/format-game-start";
import { bandFromLevel } from "@repo/domain/level";
import { zonedParts } from "@repo/domain/product-timezone";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "~/trpc/react";

import { arrowLevel, bandInText, displayBand, monthYear } from "./you-format";

export type MyProfile = RouterOutputs["users"]["myProfile"];
export type ScopeLevel = NonNullable<MyProfile["level"]>;
export type GroupLevelRow = RouterOutputs["ratings"]["myGroupLevels"][number];

/** Win rate shows once a scope has this many Matches, as `users.myProfile` reads it. */
export const WIN_RATE_AFTER = 5;

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

function groupOutlook(level: ScopeLevel, row: GroupLevelRow, locale: Locale) {
  const m = messagesFor(locale).you.hero;
  if (row.setBy) {
    return m.setOn(row.setBy.name, formatDayMonth(row.setBy.at, locale));
  }
  if (level.provisional) {
    return m.groupSettles(level.ratedMatchesRemaining);
  }
  if (level.nextBand === null || level.distanceToNext === null) {
    return m.topBand;
  }
  return m.toNextInGroup(
    level.distanceToNext.toFixed(2),
    bandInText(displayBand(level.nextBand), locale),
  );
}

/**
 * The ink hero for one scope: General reads the Temba Level, a Group reads
 * that Group Level next to its row from `ratings.myGroupLevels`.
 */
export function heroView(
  args: {
    level: ScopeLevel;
    ratedMatchCount: number;
    group: GroupLevelRow | null;
  },
  locale: Locale,
): HeroView {
  const m = messagesFor(locale).you.hero;
  const { level, group } = args;
  const ratedCount = group ? group.ratedMatchCount : args.ratedMatchCount;
  const band = displayBand(level.levelBand);
  const rating = level.rating.toFixed(2);

  let status: string;
  if (group?.setBy) {
    status = m.setByOrganizer;
  } else if (level.provisional) {
    status = m.provisionalRated(ratedCount);
  } else {
    status = group ? m.groupRated(ratedCount) : m.confirmed(ratedCount);
  }

  let move: string | null = null;
  if (group) {
    move =
      group.differenceFromGeneral === null
        ? null
        : m.vsGeneral(arrowLevel(group.differenceFromGeneral));
  } else if (level.weekDelta !== null && level.weekDelta !== 0) {
    move = m.thisWeek(arrowLevel(level.weekDelta));
  }

  return {
    label: group ? m.groupLevel(group.name) : m.generalLevel,
    status,
    band,
    rating,
    ring: ringFor(level, ratedCount, locale),
    move,
    outlook: group
      ? groupOutlook(level, group, locale)
      : generalOutlook(level, locale),
    spoken: m.spoken(bandInText(band, locale), rating, status),
  };
}

export function heroStats(
  args: { stats: MyProfile["stats"]; group: GroupLevelRow | null },
  locale: Locale,
): HeroStat[] {
  const m = messagesFor(locale).you.hero;
  const none = messagesFor(locale).webYou.noData;
  const { stats, group } = args;
  const winRate: HeroStat =
    stats.winRatePercent === null
      ? { value: none, label: m.winRateAfter(WIN_RATE_AFTER) }
      : { value: `${stats.winRatePercent}%`, label: m.winRate };
  const matches: HeroStat = { value: String(stats.played), label: m.matches };

  if (group) {
    return [
      winRate,
      matches,
      group.provisional
        ? { value: none, label: m.unranked }
        : { value: `#${group.rank}`, label: m.standing(group.rankedCount) },
    ];
  }
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
export function curveCaption(
  args: { history: ScopeLevel["history"]; groupName: string | null },
  locale: Locale,
) {
  const m = messagesFor(locale).you.hero;
  const dated = args.history.flatMap((point) => (point.at ? [point.at] : []));
  const first = dated[0];
  const last = dated[dated.length - 1];
  return {
    title: args.groupName
      ? m.graphTitleGroup(args.groupName)
      : m.graphTitle(dated.length),
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
