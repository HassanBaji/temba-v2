import { describe, expect, it } from "vitest";

import {
  rovingRadioIndex,
  rovingTabStopIndex,
  type RovingRadioState,
} from "./roving-radio";

describe("rovingRadioIndex", () => {
  it("moves forward with ArrowRight and ArrowDown, wrapping at the end", () => {
    expect(rovingRadioIndex("ArrowRight", 0, 3)).toBe(1);
    expect(rovingRadioIndex("ArrowDown", 1, 3)).toBe(2);
    expect(rovingRadioIndex("ArrowRight", 2, 3)).toBe(0);
  });

  it("moves back with ArrowLeft and ArrowUp, wrapping at the start", () => {
    expect(rovingRadioIndex("ArrowLeft", 2, 3)).toBe(1);
    expect(rovingRadioIndex("ArrowUp", 1, 3)).toBe(0);
    expect(rovingRadioIndex("ArrowLeft", 0, 3)).toBe(2);
  });

  it("jumps to the ends with Home and End", () => {
    expect(rovingRadioIndex("Home", 2, 4)).toBe(0);
    expect(rovingRadioIndex("End", 0, 4)).toBe(3);
  });

  it("starts from the first or last option when nothing is current", () => {
    expect(rovingRadioIndex("ArrowRight", -1, 3)).toBe(0);
    expect(rovingRadioIndex("ArrowLeft", -1, 3)).toBe(2);
  });

  it("stays on a lone option", () => {
    expect(rovingRadioIndex("ArrowRight", 0, 1)).toBe(0);
    expect(rovingRadioIndex("ArrowLeft", 0, 1)).toBe(0);
  });

  it("ignores other keys and empty groups", () => {
    expect(rovingRadioIndex("Enter", 0, 3)).toBeNull();
    expect(rovingRadioIndex(" ", 0, 3)).toBeNull();
    expect(rovingRadioIndex("ArrowRight", -1, 0)).toBeNull();
  });
});

describe("rovingTabStopIndex", () => {
  const radio = (
    checked: boolean,
    enabled = true,
    focusable = enabled,
  ): RovingRadioState => ({ checked, enabled, focusable });

  it("puts the stop on the checked enabled radio", () => {
    expect(rovingTabStopIndex([radio(false), radio(true), radio(false)])).toBe(
      1,
    );
  });

  it("falls back to the first enabled radio when none is checked", () => {
    expect(
      rovingTabStopIndex([radio(false, false), radio(false), radio(false)]),
    ).toBe(1);
  });

  it("skips a checked radio that is disabled while others are enabled", () => {
    expect(
      rovingTabStopIndex([radio(false), radio(true, false), radio(false)]),
    ).toBe(0);
  });

  it("keeps the stop on the checked radio while the whole group is aria-disabled", () => {
    expect(
      rovingTabStopIndex([
        radio(false, false, true),
        radio(false, false, true),
        radio(true, false, true),
      ]),
    ).toBe(2);
  });

  it("falls back to the first aria-disabled radio when none is checked", () => {
    expect(
      rovingTabStopIndex([
        radio(false, false, true),
        radio(false, false, true),
      ]),
    ).toBe(0);
  });

  it("has no stop when every radio is natively disabled", () => {
    expect(rovingTabStopIndex([radio(true, false), radio(false, false)])).toBe(
      -1,
    );
    expect(rovingTabStopIndex([])).toBe(-1);
  });
});
