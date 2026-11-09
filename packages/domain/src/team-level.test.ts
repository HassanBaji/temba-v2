import { describe, expect, it } from "vitest";

import { teamLevel, teamLevelLabel } from "./team-level";

describe("teamLevel", () => {
  it("is the mean displayed Level of the rated members, in tenths", () => {
    expect(teamLevel(["2.5", "3.0", null])).toEqual({
      tenths: 28,
      level: "2.8",
      band: "C",
    });
  });

  it("is null with no rated member", () => {
    expect(teamLevel([])).toBeNull();
    expect(teamLevel([null, null])).toBeNull();
  });

  it("reads one member as that member's Level", () => {
    expect(teamLevel(["6.6"])).toMatchObject({ level: "6.6", band: "A" });
  });
});

describe("teamLevelLabel", () => {
  it("names the band and the mean", () => {
    expect(teamLevelLabel(["2.8"], "en")).toBe("C, avg 2.8");
    expect(teamLevelLabel([null], "en")).toBeNull();
  });
});
