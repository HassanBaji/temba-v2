import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** What moved the Level into a history point: a Rated Match outcome or a set. */
export type LevelHistoryStep = "won" | "drawn" | "lost" | "set";

export const HOME_CHART_WIDTH = 100;
export const HOME_CHART_HEIGHT = 58;

export function plottedFraction(
  played: number,
  ratedMatchesRemaining: number,
): number {
  const denom = played + ratedMatchesRemaining;
  if (denom <= 0) {
    return 0.75;
  }
  return Math.min(0.75, Math.max(0.25, played / denom));
}

export function chartPointGeometry(
  values: readonly number[],
  plottedWidth: number,
  height: number,
): { x: number; y: number }[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = 6;

  return values.map((value, index) => {
    const x =
      values.length === 1
        ? plottedWidth / 2
        : (index / (values.length - 1)) * plottedWidth;
    const normalized = span === 0 ? 0.5 : (value - min) / span;
    const y = pad + (1 - normalized) * (height - pad * 2);
    return { x, y };
  });
}

export function parseLevelHistory(history: readonly string[]): {
  values: number[];
  matchCount: number;
  delta: number;
} | null {
  const values = history.map((point) => Number.parseFloat(point));
  if (values.length === 0 || values.some((value) => Number.isNaN(value))) {
    return null;
  }
  const first = values[0];
  const latest = values[values.length - 1];
  if (first === undefined || latest === undefined) {
    return null;
  }
  return {
    values,
    matchCount: Math.max(0, values.length - 1),
    delta: Math.round((latest - first) * 10) / 10,
  };
}

export type LevelChangeDirection = "up" | "down" | "none";

/** `decimals` is 1 for a Level and 0 for an OVR, which is a whole number. */
export function levelChangeView(
  delta: number,
  locale: Locale,
  decimals = 1,
): {
  direction: LevelChangeDirection;
  amount: string;
  spoken: string;
} {
  const m = messagesFor(locale).home.levelChange;
  const amount = Math.abs(delta).toFixed(decimals);
  if (Number(amount) === 0) {
    return { direction: "none", amount, spoken: m.none };
  }
  return delta > 0
    ? { direction: "up", amount, spoken: m.up }
    : { direction: "down", amount, spoken: m.down };
}

/** The length of a ring of `radius` already run toward the next band. */
export function gaugeArc(percent: number, radius: number): number {
  return (Math.max(0, Math.min(100, percent)) / 100) * 2 * Math.PI * radius;
}

/** Points for a sparkline of `values` inside a width by height box. */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
