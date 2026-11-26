import {
  seriesBadgeCount,
  seriesBadgeHex,
  seriesBadgeSizes,
  seriesBadgeToneColors,
  seriesBadgeViewBox,
  seriesEmblems,
  type SeriesBadgeSize,
  type SeriesBadgeSurface,
} from "@repo/design-tokens/series";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";

import { CoinShape } from "~/components/marks/mark-coin";
import { cn } from "~/lib/utils";

const ringClass: Record<SeriesBadgeSurface, string> = {
  paper: "border-paper",
  focus: "border-focus",
  sheet: "border-sheet",
};

/** A Series badge. Decorative: the text beside it names the series. */
export function SeriesBadge({
  emblem,
  colour,
  size,
  count,
  surface = "paper",
  className,
}: {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  size: SeriesBadgeSize;
  /** The player's wins of this series, in a pill on the bottom trailing corner. */
  count?: number;
  /** The Color role of the surface under the badge; the count's ring takes it. */
  surface?: SeriesBadgeSurface;
  className?: string;
}) {
  const px = seriesBadgeSizes[size];
  const tones = seriesBadgeToneColors(colour);

  return (
    <span
      data-slot="series-badge"
      aria-hidden="true"
      className={cn("relative block shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox={`0 0 ${seriesBadgeViewBox} ${seriesBadgeViewBox}`}
        width={px}
        height={px}
        className="block"
      >
        <polygon {...seriesBadgeHex} fill={tones.disc} stroke={tones.disc} />
        {seriesEmblems[emblem].map((element, index) => (
          <CoinShape
            key={index}
            element={element}
            colour={tones[element.tone]}
          />
        ))}
      </svg>
      {count === undefined ? null : (
        <span
          data-slot="series-badge-count"
          className={cn(
            "bg-ink text-paper absolute flex items-center justify-center font-semibold tabular-nums leading-none",
            ringClass[surface],
          )}
          style={{
            insetInlineEnd: -seriesBadgeCount.offsetEnd,
            bottom: -seriesBadgeCount.offsetBottom,
            minWidth: seriesBadgeCount.minWidth,
            height: seriesBadgeCount.height,
            paddingInline: seriesBadgeCount.paddingInline,
            borderRadius: seriesBadgeCount.radius,
            borderWidth: seriesBadgeCount.ring,
            fontSize: seriesBadgeCount.fontSize,
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
