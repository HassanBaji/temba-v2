"use client";

import {
  seriesBadgeColours,
  seriesBadgeViewBox,
  seriesEmblems,
} from "@repo/design-tokens/series";
import {
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import type { ReactNode } from "react";

import { useMessages } from "~/components/locale-provider";
import { CoinShape } from "~/components/marks/mark-coin";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

const EMBLEM_GLYPH_PX = 28;
const COLOUR_DOT_PX = 24;

/** The emblem alone, in ink: its body and accents, without the badge's shadow. */
function EmblemGlyph({ emblem }: { emblem: SeriesEmblem }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${seriesBadgeViewBox} ${seriesBadgeViewBox}`}
      width={EMBLEM_GLYPH_PX}
      height={EMBLEM_GLYPH_PX}
      className="text-ink block"
    >
      {seriesEmblems[emblem]
        .filter((element) => element.tone !== "shade")
        .map((element, index) => (
          <CoinShape key={index} element={element} colour="currentColor" />
        ))}
    </svg>
  );
}

function Chip({
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "bg-paper focus-visible:ring-ring/50 flex min-w-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-[3px]",
        selected ? "border-ink border-2" : "border-rule hover:bg-wash border",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PickerSection({
  id,
  title,
  picked,
  children,
}: {
  id: string;
  title: string;
  picked: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-expanded text-title text-ink">
          {title}
        </h2>
        <p className="text-meta text-muted-foreground shrink-0">{picked}</p>
      </div>
      {children}
    </section>
  );
}

export function SeriesEmblemPicker({
  value,
  onChange,
}: {
  value: SeriesEmblem;
  onChange: (emblem: SeriesEmblem) => void;
}) {
  const m = useMessages();
  return (
    <PickerSection
      id="series-emblem"
      title={m.series.create.emblem}
      picked={m.series.emblems[value]}
    >
      <RovingRadioGroup
        aria-labelledby="series-emblem"
        className="grid grid-cols-7 gap-1.5"
      >
        {SERIES_EMBLEMS.map((emblem) => (
          <Chip
            key={emblem}
            label={m.series.emblems[emblem]}
            selected={emblem === value}
            onSelect={() => onChange(emblem)}
            className="h-12"
          >
            <EmblemGlyph emblem={emblem} />
          </Chip>
        ))}
      </RovingRadioGroup>
    </PickerSection>
  );
}

export function SeriesColourPicker({
  value,
  onChange,
}: {
  value: SeriesColour;
  onChange: (colour: SeriesColour) => void;
}) {
  const m = useMessages();
  return (
    <PickerSection
      id="series-colour"
      title={m.series.create.colour}
      picked={m.series.colours[value]}
    >
      <RovingRadioGroup
        aria-labelledby="series-colour"
        className="grid grid-cols-6 gap-1.5"
      >
        {SERIES_COLOURS.map((colour) => (
          <Chip
            key={colour}
            label={m.series.colours[colour]}
            selected={colour === value}
            onSelect={() => onChange(colour)}
            className="h-11"
          >
            <span
              aria-hidden="true"
              className="block rounded-full"
              style={{
                width: COLOUR_DOT_PX,
                height: COLOUR_DOT_PX,
                backgroundColor: seriesBadgeColours[colour].disc,
              }}
            />
          </Chip>
        ))}
      </RovingRadioGroup>
    </PickerSection>
  );
}
