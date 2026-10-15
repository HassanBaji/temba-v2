import { describe, expect, it } from "vitest";

import { gameRates } from "./game-rating-eligibility";

describe("gameRates", () => {
  it("rates a live rated Game", () => {
    expect(gameRates({ rated: true, cancelledAt: null })).toBe(true);
  });

  it("does not rate an unrated Game", () => {
    expect(gameRates({ rated: false, cancelledAt: null })).toBe(false);
  });

  it("does not rate a cancelled Game", () => {
    expect(gameRates({ rated: true, cancelledAt: new Date() })).toBe(false);
  });
});
