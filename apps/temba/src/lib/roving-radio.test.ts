import { describe, expect, it } from "vitest";

import { rovingRadioIndex } from "~/lib/roving-radio";

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
