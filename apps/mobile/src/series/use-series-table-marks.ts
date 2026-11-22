import { useLocale } from "../i18n/locale-provider";
import { api } from "../trpc/react";
import { seriesTableMarks } from "./series-edition-card-model";

/** The winners' badge and the note for a Social's final table; null without a Series. */
export function useSeriesTableMarks(gameId: string, hasSeries: boolean) {
  const locale = useLocale();
  const edition = api.series.edition.useQuery(
    { gameId },
    { enabled: hasSeries },
  );
  return hasSeries ? seriesTableMarks(edition.data, locale) : null;
}
