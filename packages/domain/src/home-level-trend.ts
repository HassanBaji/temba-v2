import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { LevelHistoryStep } from "./home-level-chart";
import { homeLevelView, type HomeLevelInput } from "./home-level";

export type TrendPointKind = "start" | LevelHistoryStep;

export type TrendPoint = { x: number; y: number; kind: TrendPointKind };

export type HomeTrendView = {
  signedDelta: string;
  from: string;
  to: string;
  window: string;
  points: TrendPoint[];
  /** The start Level's height: the dotted line the trend is read against. */
  baselineY: number;
  startLabel: string;
  legend: string;
  spoken: string;
};

const LEGEND_ORDER = ["won", "drawn", "lost", "set"] as const;

function trendGeometry(
  values: readonly number[],
  kinds: readonly TrendPointKind[],
  box: { width: number; height: number; inset: number },
): TrendPoint[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const plotWidth = box.width - box.inset * 2;
  const plotHeight = box.height - box.inset * 2;
  return values.map((value, index) => ({
    x: box.inset + (index / (values.length - 1)) * plotWidth,
    y: box.inset + (span === 0 ? 0.5 : 1 - (value - min) / span) * plotHeight,
    kind: kinds[index] ?? "set",
  }));
}

/**
 * The home Trend: the recent Level history as a line of points, each marked
 * by what moved it. Null until a Rated Match has moved the Level.
 */
export function homeTrendView(
  input: HomeLevelInput,
  box: { width: number; height: number; inset: number },
  locale: Locale,
): HomeTrendView | null {
  const change = homeLevelView(input, locale).change;
  const values = input.history.map((point) => Number.parseFloat(point));
  const from = input.history[0];
  const to = input.history.at(-1);
  if (
    !change ||
    values.length < 2 ||
    input.historySteps.length !== values.length - 1 ||
    from === undefined ||
    to === undefined
  ) {
    return null;
  }

  const copy = messagesFor(locale).home.trend;
  const points = trendGeometry(values, ["start", ...input.historySteps], box);
  const steps = input.historySteps;
  const window = copy.lastMatches(input.historyMatchCount);
  const present = new Set(steps);

  return {
    signedDelta: change.signedAmount,
    from,
    to,
    window,
    points,
    baselineY: points[0]?.y ?? box.height / 2,
    startLabel: present.has("set")
      ? copy.changesAgo(steps.length)
      : copy.matchesAgo(steps.length),
    legend: LEGEND_ORDER.filter((kind) => present.has(kind))
      .map((kind) => copy.legend[kind])
      .join(copy.legendSeparator),
    spoken: copy.spoken(from, to, window),
  };
}
