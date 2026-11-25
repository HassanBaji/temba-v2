import { FootballInfoRows } from "~/components/games/football-info-rows";
import { useMessages } from "~/components/locale-provider";

import { seriesFactRows } from "@repo/domain/series-fact-row";

/** A facts card holding only the "Series" row, for a Game screen with no facts list of its own. */
export function SeriesFactRows({
  series,
}: {
  series: { name: string; edition: number } | null;
}) {
  const m = useMessages();
  if (!series) {
    return null;
  }
  return <FootballInfoRows rows={seriesFactRows(series, m)} />;
}
