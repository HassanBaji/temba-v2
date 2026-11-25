import { describe, expect, it } from "vitest";

import { gameCardFormatLabel, gameFormatLabel } from "./game-format-label";

describe("gameFormatLabel", () => {
  it("labels the known formats and passes unknown ones through", () => {
    expect(gameFormatLabel("friendly_game", "en")).toBe("Friendly game");
    expect(gameFormatLabel("americano", "en")).toBe("Americano");
    expect(gameFormatLabel("friendly_tournament", "en")).toBe("Social");
    expect(gameFormatLabel("round_robin", "en")).toBe("round robin");
  });

  it("labels the formats in Arabic", () => {
    expect(gameFormatLabel("friendly_game", "ar")).toBe("مباراة ودية");
    expect(gameFormatLabel("americano", "ar")).toBe("أمريكانو");
  });
});

describe("gameCardFormatLabel", () => {
  it("calls a Friendly game that counts for Temba Level a Ranked game", () => {
    expect(
      gameCardFormatLabel({ format: "friendly_game", rated: true }, "en"),
    ).toBe("Ranked game");
    expect(
      gameCardFormatLabel({ format: "friendly_game", rated: true }, "ar"),
    ).toBe("مباراة مصنّفة");
  });

  it("keeps Friendly game for a Game that moves only Tier points or nothing", () => {
    expect(
      gameCardFormatLabel({ format: "friendly_game", rated: false }, "en"),
    ).toBe("Friendly game");
  });

  it("leaves the tournament formats alone", () => {
    expect(
      gameCardFormatLabel({ format: "friendly_tournament", rated: true }, "en"),
    ).toBe("Social");
  });
});
