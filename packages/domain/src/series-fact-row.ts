import type { Messages } from "@repo/i18n/messages";

type FactRow = { label: string; value: string };
type FactSeries = { name: string; edition: number } | null | undefined;

/** The "Series" row of a Game's facts: none without a Series. */
export function seriesFactRows(
  series: FactSeries,
  messages: Messages,
): FactRow[] {
  return series
    ? [
        {
          label: messages.series.game.factsLabel,
          value: messages.series.game.facts(series.name, series.edition),
        },
      ]
    : [];
}

/** A Game's facts with the "Series" row after the Group row, or at the end when there is none. */
export function withSeriesFactRow<Row extends FactRow>(
  rows: readonly Row[],
  groupLabel: string,
  series: FactSeries,
  messages: Messages,
): (Row | FactRow)[] {
  const group = rows.findIndex((row) => row.label === groupLabel);
  const at = group === -1 ? rows.length : group + 1;
  return [
    ...rows.slice(0, at),
    ...seriesFactRows(series, messages),
    ...rows.slice(at),
  ];
}
