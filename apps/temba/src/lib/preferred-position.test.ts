import { describe, expect, it } from "vitest";

import {
  isPreferredPosition,
  PREFERRED_POSITION_CHOICES,
  PREFERRED_POSITION_UNSET_LABEL,
  PREFERRED_POSITIONS,
  preferredPositionLabel,
} from "./preferred-position";

describe("preferredPositionLabel", () => {
  it("reads each stored answer as the You row shows it", () => {
    expect(
      PREFERRED_POSITIONS.map((value) => preferredPositionLabel(value)),
    ).toEqual(["Left", "Right", "Either"]);
  });

  it("reads an unanswered Preferred Position as Not set", () => {
    expect(preferredPositionLabel(null)).toBe(PREFERRED_POSITION_UNSET_LABEL);
    expect(preferredPositionLabel(undefined)).toBe("Not set");
  });

  it("reads a value outside the enum as Not set rather than echoing it", () => {
    expect(preferredPositionLabel("")).toBe("Not set");
    expect(preferredPositionLabel("centre")).toBe("Not set");
    expect(preferredPositionLabel("LEFT")).toBe("Not set");
  });
});

describe("isPreferredPosition", () => {
  it("accepts the three enum values and nothing else", () => {
    for (const value of PREFERRED_POSITIONS) {
      expect(isPreferredPosition(value)).toBe(true);
    }
    expect(isPreferredPosition(null)).toBe(false);
    expect(isPreferredPosition(undefined)).toBe(false);
    expect(isPreferredPosition("either ")).toBe(false);
  });
});

describe("PREFERRED_POSITION_CHOICES", () => {
  it("offers the three answers in order and never offers Not set", () => {
    expect(PREFERRED_POSITION_CHOICES).toEqual([
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
      { value: "either", label: "Either" },
    ]);
    expect(
      PREFERRED_POSITION_CHOICES.map((choice) => choice.label),
    ).not.toContain(PREFERRED_POSITION_UNSET_LABEL);
  });
});
