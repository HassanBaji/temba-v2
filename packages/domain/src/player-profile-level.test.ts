import { describe, expect, it } from "vitest";

import { displayBandSpan, playerLevelCardView } from "./player-profile-level";
import { createPlayerProfileFixtures } from "./player-profile-fixtures";

const fixtures = createPlayerProfileFixtures();

describe("displayBandSpan", () => {
  it("spans every stored band behind one display label", () => {
    expect(displayBandSpan("B3")).toEqual({ lower: 4.2, upper: 5.6 });
    expect(displayBandSpan("B2")).toEqual({ lower: 4.2, upper: 5.6 });
    expect(displayBandSpan("B1")).toEqual({ lower: 5.6, upper: 6.3 });
    expect(displayBandSpan("D3")).toEqual({ lower: 0, upper: 1.4 });
    expect(displayBandSpan("A")).toEqual({ lower: 6.3, upper: 7 });
  });
});

describe("playerLevelCardView", () => {
  it("shows a hatched No Level yet without a Rating", () => {
    expect(playerLevelCardView(fixtures.newPlayer.rating)).toEqual({
      kind: "none",
      label: "No Level yet",
    });
  });

  it("uses the confirmation caption and fraction while Provisional", () => {
    expect(playerLevelCardView(fixtures.provisional.rating)).toMatchObject({
      kind: "rated",
      displayBand: "C",
      level: "3.4",
      provisional: true,
      lines: ["3 of about 5 rated games to confirm"],
      fillPercent: 60,
    });
  });

  it("reads a self-declared Rating with no rated Matches as Provisional", () => {
    expect(playerLevelCardView(fixtures.selfDeclared.rating)).toMatchObject({
      provisional: true,
      lines: ["0 of about 5 rated games to confirm"],
      fillPercent: 0,
    });
  });

  it("measures distance and progress on the display band when Confirmed", () => {
    expect(playerLevelCardView(fixtures.confirmed.rating)).toMatchObject({
      displayBand: "B",
      level: "4.8",
      provisional: false,
      lines: ["Confirmed, 64 rated matches", "0.9 to B+ · 42% through B"],
      fillPercent: 42,
    });
  });

  it("measures the next rung from the Level where the band changes", () => {
    const view = playerLevelCardView({
      levelBand: "B2",
      levelValue: 5.5,
      provisional: false,
      ratedMatchCount: 1,
      ratedMatchesRemaining: 0,
    });
    expect(view).toMatchObject({
      lines: ["Confirmed, 1 rated match", "0.2 to B+ · 93% through B"],
    });
  });

  it("never reads 0.0 while hysteresis holds the band", () => {
    const view = playerLevelCardView({
      levelBand: "B2",
      levelValue: 5.68,
      provisional: false,
      ratedMatchCount: 10,
      ratedMatchesRemaining: 0,
    });
    expect(view).toMatchObject({
      level: "5.7",
      lines: ["Confirmed, 10 rated matches", "0.1 to B+ · 100% through B"],
      fillPercent: 100,
    });
  });

  it("clamps progress to zero when hysteresis keeps a band below its span", () => {
    expect(playerLevelCardView(fixtures.hysteresis.rating)).toMatchObject({
      displayBand: "B",
      level: "4.2",
      lines: ["Confirmed, 40 rated matches", "1.6 to B+ · 0% through B"],
      fillPercent: 0,
    });
  });

  it("names the next distinct rung from a plus band", () => {
    expect(
      playerLevelCardView({
        levelBand: "C1",
        levelValue: 3.85,
        provisional: false,
        ratedMatchCount: 8,
        ratedMatchesRemaining: 0,
      }),
    ).toMatchObject({
      displayBand: "C+",
      lines: ["Confirmed, 8 rated matches", "0.5 to B · 50% through C+"],
    });
  });

  it("fills the top band and says so", () => {
    expect(playerLevelCardView(fixtures.topBand.rating)).toMatchObject({
      displayBand: "A",
      level: "6.8",
      lines: ["Confirmed, 120 rated matches", "Top Level band"],
      fillPercent: 100,
    });
  });
});
