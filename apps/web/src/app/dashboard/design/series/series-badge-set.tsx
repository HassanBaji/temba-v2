"use client";

import {
  seriesBadgeSizes,
  type SeriesBadgeSize,
} from "@repo/design-tokens/series";
import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_COLOURS,
  SERIES_EMBLEMS,
} from "@repo/domain/series";

import { useMessages } from "~/components/locale-provider";
import { SeriesBadge } from "~/components/series/series-badge";
import { Surface } from "~/components/ui/surface";

const SIZES = Object.keys(seriesBadgeSizes) as SeriesBadgeSize[];
const LIFTED_COUNTS = [1, 2, 9, 12, 30, 120];

/** Every size with and without a count, counts on the lifted surface, all 42 badges. */
export function SeriesBadgeSet() {
  const m = useMessages();

  return (
    <div className="space-y-10">
      <ul className="flex flex-wrap items-end gap-x-8 gap-y-6">
        {SIZES.map((size, index) => (
          <li key={size} className="flex flex-col items-center gap-3">
            <div className="flex items-end gap-4">
              <SeriesBadge
                emblem={DEFAULT_SERIES_EMBLEM}
                colour={DEFAULT_SERIES_COLOUR}
                size={size}
              />
              <SeriesBadge
                emblem={DEFAULT_SERIES_EMBLEM}
                colour={DEFAULT_SERIES_COLOUR}
                size={size}
                count={index + 1}
              />
            </div>
            <span className="text-meta text-muted-foreground tabular-nums">
              {seriesBadgeSizes[size]}
            </span>
          </li>
        ))}
      </ul>
      <Surface tone="ink" radius="surface" className="flex flex-wrap gap-8 p-5">
        {SERIES_COLOURS.map((colour, index) => (
          <SeriesBadge
            key={colour}
            emblem={DEFAULT_SERIES_EMBLEM}
            colour={colour}
            size="card"
            count={LIFTED_COUNTS[index]}
            surface="focus"
          />
        ))}
      </Surface>
      <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
        {SERIES_EMBLEMS.flatMap((emblem) =>
          SERIES_COLOURS.map((colour) => (
            <li
              key={`${emblem}-${colour}`}
              className="flex flex-col items-center gap-2 text-center"
            >
              <SeriesBadge emblem={emblem} colour={colour} size="card" />
              <span className="flex flex-col">
                <span className="text-meta font-semibold">
                  {m.series.emblems[emblem]}
                </span>
                <span className="text-eyebrow text-muted-foreground">
                  {m.series.colours[colour]}
                </span>
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
