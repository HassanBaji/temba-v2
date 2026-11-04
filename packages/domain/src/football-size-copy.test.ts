import { describe, expect, it } from "vitest";

import { footballSizeLabel } from "./football-size-copy";

describe("footballSizeLabel", () => {
  it("joins the side size and the players allowed", () => {
    expect(footballSizeLabel(5, 12, "en")).toBe("5-a-side · 12 players");
  });

  it("reads in Arabic", () => {
    expect(footballSizeLabel(5, 12, "ar")).toBe("5 ضد 5، حتى 12 لاعبًا");
  });
});
