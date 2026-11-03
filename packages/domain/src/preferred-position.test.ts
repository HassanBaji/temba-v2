import { describe, expect, it } from "vitest";

import {
  isPreferredPosition,
  PREFERRED_POSITIONS,
  preferredPositionChoices,
  preferredPositionLabel,
  preferredPositionNote,
  preferredPositionProfileLine,
} from "./preferred-position";

describe("preferredPositionLabel", () => {
  it("reads each stored answer as the You row shows it", () => {
    expect(
      PREFERRED_POSITIONS.map((value) => preferredPositionLabel(value, "en")),
    ).toEqual(["Left", "Right", "Either"]);
  });

  it("reads an unanswered Preferred Position as Not set", () => {
    expect(preferredPositionLabel(null, "en")).toBe("Not set");
    expect(preferredPositionLabel(undefined, "en")).toBe("Not set");
  });

  it("reads a value outside the enum as Not set rather than echoing it", () => {
    expect(preferredPositionLabel("", "en")).toBe("Not set");
    expect(preferredPositionLabel("centre", "en")).toBe("Not set");
    expect(preferredPositionLabel("LEFT", "en")).toBe("Not set");
  });
});

describe("preferredPositionNote", () => {
  it("covers unset, left, right, and either", () => {
    expect(preferredPositionNote(null, "en")).toBe(
      "Not set. We start you on the left when you register with a partner.",
    );
    expect(preferredPositionNote(undefined, "en")).toBe(
      "Not set. We start you on the left when you register with a partner.",
    );
    expect(preferredPositionNote("centre", "en")).toBe(
      "Not set. We start you on the left when you register with a partner.",
    );
    expect(preferredPositionNote("left", "en")).toBe(
      "We start you on the left when you register with a partner.",
    );
    expect(preferredPositionNote("right", "en")).toBe(
      "We start you on the right when you register with a partner.",
    );
    expect(preferredPositionNote("either", "en")).toBe(
      "Either side. Your partner's preference decides.",
    );
  });
});

describe("preferredPositionProfileLine", () => {
  it("reads each stored answer as the Profile identity line", () => {
    expect(preferredPositionProfileLine("left", "en")).toBe("Left side");
    expect(preferredPositionProfileLine("right", "en")).toBe("Right side");
    expect(preferredPositionProfileLine("either", "en")).toBe("Either side");
  });

  it("omits the line when Preferred Position is unset", () => {
    expect(preferredPositionProfileLine(null, "en")).toBeNull();
    expect(preferredPositionProfileLine(undefined, "en")).toBeNull();
    expect(preferredPositionProfileLine("centre", "en")).toBeNull();
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

describe("preferredPositionChoices", () => {
  it("offers the three answers in order and never offers Not set", () => {
    expect(preferredPositionChoices("en")).toEqual([
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
      { value: "either", label: "Either" },
    ]);
    expect(
      preferredPositionChoices("en").map((choice) => choice.label),
    ).not.toContain("Not set");
  });

  it("keeps the stored values and reads the labels in Arabic", () => {
    expect(
      preferredPositionChoices("ar").map((choice) => choice.value),
    ).toEqual(["left", "right", "either"]);
    expect(preferredPositionLabel("left", "ar")).toBe("يسار");
    expect(preferredPositionLabel(null, "ar")).toBe("غير محدد");
    expect(preferredPositionProfileLine("either", "ar")).toBe("أي جهة");
  });
});
