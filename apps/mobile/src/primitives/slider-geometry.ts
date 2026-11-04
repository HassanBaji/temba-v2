export type SliderTrack = {
  min: number;
  max: number;
  width: number;
  thumb: number;
};

export type SliderDirection = "ltr" | "rtl";

export function sliderX(value: number, track: SliderTrack): number {
  const fraction = (value - track.min) / (track.max - track.min);
  return track.thumb / 2 + (track.width - track.thumb) * fraction;
}

export function sliderValueFromDrag(
  startValue: number,
  dx: number,
  track: SliderTrack,
  direction: SliderDirection,
): number {
  const travel = track.width - track.thumb;
  if (travel <= 0) {
    return startValue;
  }
  const towardMax = direction === "rtl" ? -dx : dx;
  const raw = startValue + (towardMax / travel) * (track.max - track.min);
  return Math.min(track.max, Math.max(track.min, Math.round(raw)));
}

// The track's `left` offsets swap to the right edge in RTL, but translateX
// stays physical, so the thumb has to move the other way to stay on the fill.
export function sliderThumbTranslateX(
  x: number,
  thumb: number,
  direction: SliderDirection,
): number {
  "worklet";
  const offset = x - thumb / 2;
  return direction === "rtl" ? -offset : offset;
}

export function sliderLabelLeft(
  centre: number,
  labelWidth: number,
  trackWidth: number,
): number {
  return Math.max(
    0,
    Math.min(centre - labelWidth / 2, trackWidth - labelWidth),
  );
}
