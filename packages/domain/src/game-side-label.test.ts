import { describe, expect, it } from "vitest";

import {
  formatGameSideLabel,
  formatMatchSlotLabel,
  formatSeatSideHeading,
  gameTeamDisplayName,
  matchSlotOccupantLabel,
} from "./game-side-label";

describe("game side labels", () => {
  it("letters the sides of a Friendly game and numbers the rest", () => {
    expect(formatGameSideLabel("friendly_game", 1, "en")).toBe("Team A");
    expect(formatGameSideLabel("friendly_tournament", 2, "en")).toBe("Team B");
    expect(formatGameSideLabel("americano", 3, "en")).toBe("Team 3");
    expect(formatMatchSlotLabel("friendly_game", 2, "en")).toBe("Team B");
    expect(formatMatchSlotLabel("americano", 2, "en")).toBe("Team 2");
  });

  it("heads a two-sided Team grid by letter and keeps other nouns", () => {
    expect(formatSeatSideHeading("Team", 1, 2, "en")).toBe("Team A");
    expect(formatSeatSideHeading("Team", 3, 4, "en")).toBe("Team 3");
    expect(formatSeatSideHeading("Side", 2, 2, "en")).toBe("Side 2");
  });

  it("names a Game team by its members, its name, or a fallback", () => {
    const sides = [
      { id: "a", members: [{ name: "Ada" }, { name: "Lin" }], name: null },
      { id: "b", members: [], name: "Smashers" },
      { id: "c", members: [], name: null },
    ];
    expect(gameTeamDisplayName(sides[0]!, "en")).toBe("Ada / Lin");
    expect(gameTeamDisplayName(sides[1]!, "en")).toBe("Smashers");
    expect(gameTeamDisplayName(sides[2]!, "en")).toBe("Game team");
    expect(matchSlotOccupantLabel(sides, "b", "en")).toBe("Smashers");
    expect(matchSlotOccupantLabel(sides, null, "en")).toBeNull();
  });

  it("labels the sides in Arabic", () => {
    expect(formatGameSideLabel("friendly_game", 1, "ar")).toBe("الفريق أ");
    expect(formatGameSideLabel("friendly_tournament", 5, "ar")).toBe(
      "الفريق هـ",
    );
    expect(formatMatchSlotLabel("friendly_game", 2, "ar")).toBe("الفريق ب");
    expect(formatSeatSideHeading("Team", 3, 4, "ar")).toBe("الفريق 3");
    expect(gameTeamDisplayName({ members: [], name: null }, "ar")).toBe(
      "فريق المباراة",
    );
  });
});
