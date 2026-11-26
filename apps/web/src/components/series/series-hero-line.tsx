import type { SurfaceTone } from "@repo/domain/surface-tone";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { SeriesBadge } from "./series-badge";
import type { SeriesAttachOption } from "./series-field";

export type SeriesHeroLineSeries = Pick<
  SeriesAttachOption,
  "name" | "emblem" | "colour" | "edition"
>;

/** A Game as `games.byId` returns it: its Series, or none. */
export type WithGameSeries = { series?: SeriesHeroLineSeries | null };

/** The Game's Series and Edition on its lifted card (designs 2b and 2c). */
export function SeriesHeroLine({
  series,
  tone,
  className,
}: {
  series: SeriesHeroLineSeries;
  /** The surface under the line; its muted text follows it. */
  tone: SurfaceTone;
  className?: string;
}) {
  const m = useMessages();
  return (
    <p
      data-slot="series-hero-line"
      className={cn("text-meta flex min-w-0 items-center gap-2", className)}
    >
      <SeriesBadge
        emblem={series.emblem}
        colour={series.colour}
        size="line"
        surface={tone === "ink" ? "focus" : "paper"}
      />
      <span className="min-w-0 truncate font-semibold">{series.name}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          tone === "ink" ? "text-dim" : "text-muted-foreground",
        )}
      >
        {m.series.game.heroEdition(series.edition)}
      </span>
    </p>
  );
}
