import type { RecentFormView } from "@repo/domain/home-recent-form";

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

/** Last 10 reads oldest first, with the unplayed slots hatched at the end. */
export function lastTenOrder(
  bars: RecentFormView["bars"],
): RecentFormView["bars"] {
  const played = bars.filter((bar) => bar.kind === "played").reverse();
  const empty = bars.filter((bar) => bar.kind === "empty");
  return [...played, ...empty];
}
