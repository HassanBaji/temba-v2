import { describe, expect, it } from "vitest";

import { gameRates, gameRatesGroup } from "./game-rating-eligibility";

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

describe("gameRatesGroup", () => {
  const live = { groupRated: true, groupId: "g", cancelledAt: null };

  it("rates a live group rated Game on a Group", () => {
    expect(gameRatesGroup(live)).toBe(true);
  });

  it("does not rate without a Group", () => {
    expect(gameRatesGroup({ ...live, groupId: null })).toBe(false);
  });

  it("does not rate a Game that is not group rated", () => {
    expect(gameRatesGroup({ ...live, groupRated: false })).toBe(false);
  });

  it("does not rate a cancelled Game", () => {
    expect(gameRatesGroup({ ...live, cancelledAt: new Date() })).toBe(false);
  });
});
