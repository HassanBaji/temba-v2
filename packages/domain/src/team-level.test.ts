import { describe, expect, it } from "vitest";

import { levelFromOvr } from "./football-ovr";
import { teamLevel, teamLevelLabel } from "./team-level";

describe("teamLevel", () => {
  it("is the mean displayed Level of the rated members, in tenths", () => {
    expect(teamLevel(["2.5", "3.0", null], "padel")).toEqual({
      tenths: 28,
      level: "2.8",
      band: "C",
      ovr: null,
    });
  });

  it("is null with no rated member", () => {
    expect(teamLevel([], "padel")).toBeNull();
    expect(teamLevel([null, null], "football")).toBeNull();
  });

  it("reads one member as that member's Level", () => {
    expect(teamLevel(["6.6"], "padel")).toMatchObject({
      level: "6.6",
      band: "A",
    });
  });

  it("reads a football Team as the mean of its members' OVRs", () => {
    expect(
      teamLevel([levelFromOvr(72), levelFromOvr(77), null], "football"),
    ).toMatchObject({ ovr: 75 });
    expect(teamLevel([3.85], "football")).toMatchObject({
      tenths: 39,
      band: "C+",
      ovr: 72,
    });
  });
});

describe("teamLevelLabel", () => {
  it("names the band and the mean", () => {
    expect(teamLevelLabel(["2.8"], "padel", "en")).toBe("C, avg 2.8");
    expect(teamLevelLabel([null], "padel", "en")).toBeNull();
  });

  it("names the mean OVR on football", () => {
    expect(teamLevelLabel([levelFromOvr(74)], "football", "en")).toBe(
      "C+, avg OVR 74",
    );
  });
});
