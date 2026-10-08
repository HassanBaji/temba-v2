"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "~/lib/utils";

export const SLIDER_THUMB_PX = 24;

function Slider({
  className,
  thumbLabel,
  thumbValueText,
  children,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabel: string;
  thumbValueText?: string;
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex h-11 w-full touch-none select-none items-center data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-wash border-rule relative h-1.5 w-full grow overflow-hidden rounded-full border"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-ink absolute h-full"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={thumbLabel}
        aria-valuetext={thumbValueText}
        className="bg-ink border-paper focus-visible:ring-ring/50 block rounded-full border-2 outline-none focus-visible:ring-[3px]"
        style={{ width: SLIDER_THUMB_PX, height: SLIDER_THUMB_PX }}
      />
      {children}
    </SliderPrimitive.Root>
  );
}

export { Slider };
