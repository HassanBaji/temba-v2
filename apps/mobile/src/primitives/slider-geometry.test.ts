import { describe, expect, it } from "vitest";

import {
  sliderLabelLeft,
  sliderValueFromDrag,
  sliderX,
  type SliderTrack,
} from "./slider-geometry";

const TRACK: SliderTrack = { min: 0, max: 70, width: 328, thumb: 28 };

describe("sliderX", () => {
  it("stops half a thumb short of each end", () => {
    expect(sliderX(0, TRACK)).toBe(14);
    expect(sliderX(70, TRACK)).toBe(314);
    expect(sliderX(35, TRACK)).toBe(164);
  });
});

describe("sliderValueFromDrag", () => {
  it("moves one step per travel/range pixels and rounds to a whole step", () => {
    expect(sliderValueFromDrag(30, 0, TRACK)).toBe(30);
    expect(sliderValueFromDrag(30, 30, TRACK)).toBe(37);
    expect(sliderValueFromDrag(30, -30, TRACK)).toBe(23);
  });

  it("clamps to the range", () => {
    expect(sliderValueFromDrag(60, 1000, TRACK)).toBe(70);
    expect(sliderValueFromDrag(10, -1000, TRACK)).toBe(0);
  });

  it("keeps the value before the track is measured", () => {
    expect(sliderValueFromDrag(30, 50, { ...TRACK, width: 0 })).toBe(30);
  });
});

describe("sliderLabelLeft", () => {
  it("centres a label on a point and keeps it inside the track", () => {
    expect(sliderLabelLeft(164, 72, 328)).toBe(128);
    expect(sliderLabelLeft(14, 72, 328)).toBe(0);
    expect(sliderLabelLeft(314, 72, 328)).toBe(256);
  });
});
