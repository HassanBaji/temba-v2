import { describe, expect, it } from "vitest";

import { keyboardOverlap } from "./keyboard-overlap";

describe("keyboardOverlap", () => {
  it("is nothing while the keyboard is hidden", () => {
    expect(keyboardOverlap(852, null)).toBe(0);
  });

  it("is the part of the view below the keyboard's top edge", () => {
    expect(keyboardOverlap(852, 507)).toBe(345);
  });

  it("is nothing once the view already ends at the keyboard", () => {
    expect(keyboardOverlap(507, 507)).toBe(0);
    expect(keyboardOverlap(500, 507)).toBe(0);
  });
});
