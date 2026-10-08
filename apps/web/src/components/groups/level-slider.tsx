"use client";

import { Slider, SLIDER_THUMB_PX } from "~/components/ui/slider";
import {
  LEVEL_SLIDER_TICKS,
  levelSliderLabel,
} from "@repo/domain/level-slider";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";

/** Where a tenths value sits along the thumb's travel, which stops half a thumb short of each end. */
function leftAt(tenths: number) {
  return `calc(${SLIDER_THUMB_PX / 2}px + (100% - ${SLIDER_THUMB_PX}px) * ${tenths / LEVEL_TENTHS_MAX})`;
}

export function LevelSlider({
  tenths,
  currentTenths,
  onTenthsChange,
}: {
  tenths: number;
  currentTenths: number;
  onTenthsChange: (tenths: number) => void;
}) {
  return (
    <div data-vaul-no-drag className="px-4">
      <div className="relative h-8">
        <span
          data-slot="level-slider-value"
          aria-hidden="true"
          className="bg-ink text-paper text-meta absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-sm px-2 py-1 font-semibold"
          style={{ left: leftAt(tenths) }}
        >
          {levelSliderLabel(tenths)}
        </span>
      </div>
      <div className="relative">
        <Slider
          min={LEVEL_TENTHS_MIN}
          max={LEVEL_TENTHS_MAX}
          step={1}
          value={[tenths]}
          onValueChange={([next]) => {
            if (next !== undefined) {
              onTenthsChange(next);
            }
          }}
          thumbLabel="Level"
          thumbValueText={levelSliderLabel(tenths)}
        >
          <span
            data-slot="level-slider-now"
            aria-hidden="true"
            className="bg-muted-foreground pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: leftAt(currentTenths) }}
          />
        </Slider>
        <div className="relative h-6" aria-hidden="true">
          {LEVEL_SLIDER_TICKS.edgesTenths.map((edge) => (
            <span
              key={edge}
              className="bg-rule absolute top-0 h-1.5 w-px"
              style={{ left: leftAt(edge) }}
            />
          ))}
          {LEVEL_SLIDER_TICKS.letters.map((letter) => (
            <span
              key={letter.label}
              className="text-muted-foreground text-meta absolute top-1.5 -translate-x-1/2"
              style={{ left: leftAt(letter.centreTenths) }}
            >
              {letter.label}
            </span>
          ))}
        </div>
        <div className="relative h-5" aria-hidden="true">
          <span
            className="text-muted-foreground text-meta absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: leftAt(currentTenths) }}
          >
            Now {levelSliderLabel(currentTenths)}
          </span>
        </div>
      </div>
      <div className="text-muted-foreground text-meta flex justify-between pt-1">
        <span aria-hidden="true">{LEVEL_SLIDER_TICKS.startLabel}</span>
        <span aria-hidden="true">{LEVEL_SLIDER_TICKS.endLabel}</span>
      </div>
    </div>
  );
}
