import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { seriesRuleLine, seriesWonLastLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { seriesPagePath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

type SeriesEditionData = NonNullable<RouterOutputs["series"]["edition"]>;

export type SeriesGameCardInput = Pick<
  SeriesEditionData,
  "series" | "edition" | "rule" | "state" | "lastWinners" | "canOpenSeries"
>;

export type SeriesGameCardModel = {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  title: string;
  rule: string;
  href: string | null;
};

/**
 * The "Part of" card under a Game's lifted card (designs 2b and 2c), while
 * its Edition is not decided. Null once it is, or when there is no Series.
 */
export function seriesGameCardModel(
  edition: SeriesGameCardInput | null | undefined,
  locale: Locale,
): SeriesGameCardModel | null {
  if (edition?.state !== "upcoming") {
    return null;
  }
  const m = messagesFor(locale).series.game;
  const wonLast = seriesWonLastLine(edition.lastWinners, locale);
  const rule = seriesRuleLine(edition.rule, edition.edition, locale);
  return {
    emblem: edition.series.emblem,
    colour: edition.series.colour,
    title: m.partOf(edition.series.name),
    rule: wonLast ? `${rule} ${wonLast}` : rule,
    href: edition.canOpenSeries ? seriesPagePath(edition.series.id) : null,
  };
}
