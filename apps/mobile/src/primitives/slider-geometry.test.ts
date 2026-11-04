import { describe, expect, it } from "vitest";

import {
  sliderLabelLeft,
  sliderThumbTranslateX,
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
    expect(sliderValueFromDrag(30, 0, TRACK, "ltr")).toBe(30);
    expect(sliderValueFromDrag(30, 30, TRACK, "ltr")).toBe(37);
    expect(sliderValueFromDrag(30, -30, TRACK, "ltr")).toBe(23);
  });

  it("raises the value when dragging left in RTL", () => {
    expect(sliderValueFromDrag(30, 0, TRACK, "rtl")).toBe(30);
    expect(sliderValueFromDrag(30, -30, TRACK, "rtl")).toBe(37);
    expect(sliderValueFromDrag(30, 30, TRACK, "rtl")).toBe(23);
  });

  it("clamps to the range", () => {
    expect(sliderValueFromDrag(60, 1000, TRACK, "ltr")).toBe(70);
    expect(sliderValueFromDrag(10, -1000, TRACK, "ltr")).toBe(0);
    expect(sliderValueFromDrag(60, -1000, TRACK, "rtl")).toBe(70);
    expect(sliderValueFromDrag(10, 1000, TRACK, "rtl")).toBe(0);
  });

  it("keeps the value before the track is measured", () => {
    expect(sliderValueFromDrag(30, 50, { ...TRACK, width: 0 }, "ltr")).toBe(30);
    expect(sliderValueFromDrag(30, 50, { ...TRACK, width: 0 }, "rtl")).toBe(30);
  });
});

describe("sliderThumbTranslateX", () => {
  it("moves the thumb right from the left edge in LTR", () => {
    expect(sliderThumbTranslateX(sliderX(0, TRACK), 28, "ltr")).toBe(0);
    expect(sliderThumbTranslateX(sliderX(35, TRACK), 28, "ltr")).toBe(150);
    expect(sliderThumbTranslateX(sliderX(70, TRACK), 28, "ltr")).toBe(300);
  });

  it("moves the thumb left from the right edge in RTL", () => {
    expect(sliderThumbTranslateX(sliderX(35, TRACK), 28, "rtl")).toBe(-150);
    expect(sliderThumbTranslateX(sliderX(70, TRACK), 28, "rtl")).toBe(-300);
  });

  it("centres the thumb on the fill end in both directions", () => {
    for (const value of [0, 23, 35, 70]) {
      const fillEnd = sliderX(value, TRACK);
      const ltrCentre =
        sliderThumbTranslateX(fillEnd, TRACK.thumb, "ltr") + TRACK.thumb / 2;
      const rtlCentre =
        TRACK.width -
        TRACK.thumb / 2 +
        sliderThumbTranslateX(fillEnd, TRACK.thumb, "rtl");
      expect(ltrCentre).toBe(fillEnd);
      expect(rtlCentre).toBe(TRACK.width - fillEnd);
    }
  });
});

describe("sliderLabelLeft", () => {
  it("centres a label on a point and keeps it inside the track", () => {
    expect(sliderLabelLeft(164, 72, 328)).toBe(128);
    expect(sliderLabelLeft(14, 72, 328)).toBe(0);
    expect(sliderLabelLeft(314, 72, 328)).toBe(256);
  });
});
