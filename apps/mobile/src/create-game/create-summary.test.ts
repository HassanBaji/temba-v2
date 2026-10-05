import { describe, expect, it } from "vitest";

import { levelRangeSummary } from "./create-summary";

describe("levelRangeSummary", () => {
  it("reads Any for both bounds and is open when neither is set", () => {
    expect(levelRangeSummary("none", "none")).toEqual({
      minimum: "Any",
      maximum: "Any",
      open: true,
    });
  });

  it("shows the minimum alone", () => {
    expect(levelRangeSummary("C", "none")).toEqual({
      minimum: "C",
      maximum: "Any",
      open: false,
    });
  });

  it("shows the maximum alone", () => {
    expect(levelRangeSummary("none", "B+")).toEqual({
      minimum: "Any",
      maximum: "B+",
      open: false,
    });
  });

  it("shows both bounds", () => {
    expect(levelRangeSummary("D+", "B")).toEqual({
      minimum: "D+",
      maximum: "B",
      open: false,
    });
  });
});
