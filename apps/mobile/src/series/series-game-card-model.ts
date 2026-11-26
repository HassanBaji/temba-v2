import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { seriesRuleLine, seriesWonLastLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

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
  /** What a screen reader says for the whole card. */
  spoken: string;
  /** The Series to open, or null when the viewer may not view its Group. */
  seriesId: string | null;
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
  const ruleLine = seriesRuleLine(edition.rule, edition.edition, locale);
  const rule = wonLast ? `${ruleLine} ${wonLast}` : ruleLine;
  const title = m.partOf(edition.series.name);
  return {
    emblem: edition.series.emblem,
    colour: edition.series.colour,
    title,
    rule,
    spoken: m.cardLabel(title, rule),
    seriesId: edition.canOpenSeries ? edition.series.id : null,
  };
}
