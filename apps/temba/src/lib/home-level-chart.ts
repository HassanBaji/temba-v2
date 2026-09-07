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
