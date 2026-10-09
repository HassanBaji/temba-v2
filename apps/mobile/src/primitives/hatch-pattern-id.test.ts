import { describe, expect, it } from "vitest";

import { hatchPatternId } from "./hatch-pattern-id";

describe("hatchPatternId", () => {
  it("strips characters that are unsafe in an SVG id", () => {
    expect(hatchPatternId(":r1a:")).toBe("hatch-r1a");
  });

  it("differs per instance", () => {
    expect(hatchPatternId(":r1:")).not.toBe(hatchPatternId(":r2:"));
  });
});
