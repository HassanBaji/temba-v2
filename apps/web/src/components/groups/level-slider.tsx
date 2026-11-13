"use client";

import { useMessages } from "~/components/locale-provider";
import { Slider, SLIDER_THUMB_PX } from "~/components/ui/slider";
import { OVR_MAX, OVR_MIN, type LevelFace } from "@repo/domain/football-ovr";
import {
  LEVEL_SLIDER_TICKS,
  levelSliderLabel,
  OVR_SLIDER_TICKS,
  ovrSliderLabel,
} from "@repo/domain/level-slider";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";

/** A face's slider: padel in Level tenths, football in whole OVR. */
const SCALES = {
  level: {
    min: LEVEL_TENTHS_MIN,
    max: LEVEL_TENTHS_MAX,
    edges: LEVEL_SLIDER_TICKS.edgesTenths,
    letters: LEVEL_SLIDER_TICKS.letters.map((letter) => ({
      label: letter.label,
      at: letter.centreTenths,
    })),
    startLabel: LEVEL_SLIDER_TICKS.startLabel,
    endLabel: LEVEL_SLIDER_TICKS.endLabel,
    label: levelSliderLabel,
  },
  ovr: {
    min: OVR_MIN,
    max: OVR_MAX,
    edges: OVR_SLIDER_TICKS.edges,
    letters: OVR_SLIDER_TICKS.letters.map((letter) => ({
      label: letter.label,
      at: letter.centre,
    })),
    startLabel: OVR_SLIDER_TICKS.startLabel,
    endLabel: OVR_SLIDER_TICKS.endLabel,
    label: ovrSliderLabel,
  },
} satisfies Record<LevelFace, unknown>;

/**
 * The slider of a Level override. `value` is in the face's unit: Level
 * tenths for padel, whole OVR for football.
 */
export function LevelSlider({
  face = "level",
  value,
  currentValue,
  onValueChange,
  currentLabel,
}: {
  face?: LevelFace;
  value: number;
  currentValue: number;
  onValueChange: (value: number) => void;
  /** Names the marker at `currentValue`; "Now …" by default. */
  currentLabel?: string;
}) {
  const m = useMessages();
  const scale = SCALES[face];

  /** Where a value sits from the start side along the thumb's travel, which stops half a thumb short of each end. */
  function insetAt(at: number) {
    const fraction = (at - scale.min) / (scale.max - scale.min);
    return `calc(${SLIDER_THUMB_PX / 2}px + (100% - ${SLIDER_THUMB_PX}px) * ${fraction})`;
  }

  return (
    <div className="px-4">
      <div className="relative h-8">
        <span
          data-slot="level-slider-value"
          aria-hidden="true"
          className="bg-control text-on-control text-meta absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-sm px-2 py-1 font-semibold rtl:translate-x-1/2"
          style={{ insetInlineStart: insetAt(value) }}
        >
          <bdi dir="ltr">{scale.label(value)}</bdi>
        </span>
      </div>
      <div className="relative">
        <Slider
          min={scale.min}
          max={scale.max}
          step={1}
          value={[value]}
          onValueChange={([next]) => {
            if (next !== undefined) {
              onValueChange(next);
            }
          }}
          thumbLabel={m.common.level}
          thumbValueText={scale.label(value)}
        >
          <span
            data-slot="level-slider-now"
            aria-hidden="true"
            className="bg-muted-foreground pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
            style={{ insetInlineStart: insetAt(currentValue) }}
          />
        </Slider>
        <div className="relative h-6" aria-hidden="true">
          {scale.edges.map((edge) => (
            <span
              key={edge}
              className="bg-rule absolute top-0 h-1.5 w-px"
              style={{ insetInlineStart: insetAt(edge) }}
            />
          ))}
          {scale.letters.map((letter) => (
            <span
              key={letter.label}
              className="text-muted-foreground text-meta absolute top-1.5 -translate-x-1/2 rtl:translate-x-1/2"
              style={{ insetInlineStart: insetAt(letter.at) }}
            >
              {letter.label}
            </span>
          ))}
        </div>
        <div className="relative h-5" aria-hidden="true">
          <span
            className="text-muted-foreground text-meta absolute -translate-x-1/2 whitespace-nowrap rtl:translate-x-1/2"
            style={{ insetInlineStart: insetAt(currentValue) }}
          >
            {currentLabel ?? m.webGroup.setLevel.now(scale.label(currentValue))}
          </span>
        </div>
      </div>
      <div className="text-muted-foreground text-meta flex justify-between pt-1">
        <span aria-hidden="true">{scale.startLabel}</span>
        <span aria-hidden="true">{scale.endLabel}</span>
      </div>
    </div>
  );
}
