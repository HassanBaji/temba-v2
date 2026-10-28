import { describe, expect, it } from "vitest";

import {
  FOOTBALL_SELF_PLACEMENTS,
  footballSelfPlacementLabel,
  selfDeclareChoiceFromFootballPlacement,
} from "./football-self-placement";

describe("selfDeclareChoiceFromFootballPlacement", () => {
  it("declares the lower third of D, C and B", () => {
    expect(
      FOOTBALL_SELF_PLACEMENTS.map(selfDeclareChoiceFromFootballPlacement),
    ).toEqual(["D3", "C3", "B3"]);
  });
});

describe("footballSelfPlacementLabel", () => {
  it("reads each placement as a word", () => {
    expect(FOOTBALL_SELF_PLACEMENTS.map(footballSelfPlacementLabel)).toEqual([
      "Casual",
      "Competitive",
      "Pro",
    ]);
  });
});
