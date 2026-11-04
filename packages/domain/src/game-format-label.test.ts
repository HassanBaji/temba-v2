import { describe, expect, it } from "vitest";

import { gameFormatLabel } from "./game-format-label";

describe("gameFormatLabel", () => {
  it("labels the known formats and passes unknown ones through", () => {
    expect(gameFormatLabel("friendly_game", "en")).toBe("Friendly game");
    expect(gameFormatLabel("americano", "en")).toBe("Americano");
    expect(gameFormatLabel("friendly_tournament", "en")).toBe(
      "Friendly tournament",
    );
    expect(gameFormatLabel("round_robin", "en")).toBe("round robin");
  });

  it("labels the formats in Arabic", () => {
    expect(gameFormatLabel("friendly_game", "ar")).toBe("لعبة ودية");
    expect(gameFormatLabel("americano", "ar")).toBe("أمريكانو");
  });
});
