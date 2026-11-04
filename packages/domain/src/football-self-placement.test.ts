import { describe, expect, it } from "vitest";

import {
  FOOTBALL_SELF_PLACEMENTS,
  footballSelfPlacementChoices,
  footballSelfPlacementLabel,
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
