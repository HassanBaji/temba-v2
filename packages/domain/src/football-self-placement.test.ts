import { describe, expect, it } from "vitest";

import {
  FOOTBALL_SELF_PLACEMENTS,
  footballSelfPlacementChoices,
  footballSelfPlacementLabel,
  footballSelfPlacementOvr,
  selfDeclareChoiceFromFootballPlacement,
} from "./football-self-placement";

describe("selfDeclareChoiceFromFootballPlacement", () => {
  it("declares D, C, C+ and B, each at its lower third", () => {
    expect(
      FOOTBALL_SELF_PLACEMENTS.map(selfDeclareChoiceFromFootballPlacement),
    ).toEqual(["D3", "C3", "C1", "B3"]);
  });
});

describe("footballSelfPlacementLabel", () => {
  it("reads each placement as a word", () => {
    expect(
      FOOTBALL_SELF_PLACEMENTS.map((placement) =>
        footballSelfPlacementLabel(placement, "en"),
      ),
    ).toEqual(["Beginner", "Casual", "Competitive", "Pro"]);
  });

  it("reads the placements in Arabic", () => {
    expect(footballSelfPlacementLabel("beginner", "ar")).toBe("مبتدئ");
    expect(
      footballSelfPlacementChoices("ar").map((choice) => choice.band),
    ).toEqual(["D", "C-", "C+", "B-"]);
    expect(footballSelfPlacementChoices("ar")[3]?.label).toBe("محترف");
  });
});

describe("footballSelfPlacementOvr", () => {
  it("starts a Beginner, Casual, Competitive and Pro at 43, 61, 72 and 78", () => {
    expect(FOOTBALL_SELF_PLACEMENTS.map(footballSelfPlacementOvr)).toEqual([
      "43",
      "61",
      "72",
      "78",
    ]);
  });
});

describe("footballSelfPlacementChoices", () => {
  it("states the OVR each choice starts at", () => {
    const competitive = footballSelfPlacementChoices("en")[2];
    expect(competitive?.ovr).toBe("72");
    expect(competitive?.description).toBe(
      "Plays local tournaments, lasts the full match. 2–3× a week. Starts at OVR 72.",
    );
    expect(footballSelfPlacementChoices("ar")[0]?.description).toContain("43");
  });
});
