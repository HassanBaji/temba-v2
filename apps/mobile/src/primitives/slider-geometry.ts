export type SliderTrack = {
  min: number;
  max: number;
  width: number;
  thumb: number;
};

export function sliderX(value: number, track: SliderTrack): number {
  const fraction = (value - track.min) / (track.max - track.min);
  return track.thumb / 2 + (track.width - track.thumb) * fraction;
}

export function sliderValueFromDrag(
  startValue: number,
  dx: number,
  track: SliderTrack,
): number {
  const travel = track.width - track.thumb;
  if (travel <= 0) {
    return startValue;
  }
  const raw = startValue + (dx / travel) * (track.max - track.min);
  return Math.min(track.max, Math.max(track.min, Math.round(raw)));
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
