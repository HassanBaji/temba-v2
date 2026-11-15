import { isolate } from "@repo/i18n/bidi";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { LevelFace } from "./football-ovr";
import type { LevelHistoryStep } from "./home-level-chart";
import { signedLevelChange } from "./ratings-screen";

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

/** The recent Level history `ratings.me` reads, on the sport's face. */
export type HomeTrendInput = {
  face: LevelFace;
  history: readonly string[];
  historySteps: readonly LevelHistoryStep[];
  historyMatchCount: number;
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
  input: HomeTrendInput,
  box: { width: number; height: number; inset: number },
  locale: Locale,
): HomeTrendView | null {
  const values = input.history.map((point) => Number.parseFloat(point));
  const from = input.history[0];
  const to = input.history.at(-1);
  if (
    input.historyMatchCount === 0 ||
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
    signedDelta: isolate(
      signedLevelChange((values.at(-1) ?? 0) - (values[0] ?? 0), input.face),
    ),
    from,
    to,
    window,
    points,
    baselineY: points[0]?.y ?? box.height / 2,
    startLabel:
      present.has("set") || present.has("placed")
        ? copy.changesAgo(steps.length)
        : copy.matchesAgo(steps.length),
    // A Place award is wins against the field, so it reads as a won point.
    legend: LEGEND_ORDER.filter(
      (kind) => present.has(kind) || (kind === "won" && present.has("placed")),
    )
      .map((kind) => copy.legend[kind])
      .join(copy.legendSeparator),
    spoken: copy.spoken(from, to, window),
  };
}
