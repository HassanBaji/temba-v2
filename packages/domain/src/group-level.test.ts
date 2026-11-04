import { describe, expect, it } from "vitest";

import { GROUP_RATING_START_PHI, groupRatingStart } from "./group-level";
import {
  INITIAL_MU,
  INITIAL_PHI,
  isProvisional,
  muFromLevel,
  ratedMatchesRemainingToConfirm,
} from "./level";

describe("groupRatingStart", () => {
  it("starts from the Temba μ, Provisional", () => {
    const start = groupRatingStart({
      mu: muFromLevel(3.2),
      phi: 90,
      sigma: 0.05,
    });
    expect(start.mu).toBe(muFromLevel(3.2));
    expect(start.phi).toBe(GROUP_RATING_START_PHI);
    expect(start.sigma).toBe(0.05);
    expect(start.levelBand).toBe("C2");
    expect(isProvisional(start.phi)).toBe(true);
    expect(ratedMatchesRemainingToConfirm(start.phi)).toBe(2);
  });

  it("keeps a less certain Temba φ", () => {
    expect(
      groupRatingStart({ mu: INITIAL_MU, phi: 320, sigma: 0.06 }).phi,
    ).toBe(320);
  });

  it("starts from the unknown Rating without a Temba one", () => {
    const start = groupRatingStart(null);
    expect(start.mu).toBe(INITIAL_MU);
    expect(start.phi).toBe(INITIAL_PHI);
  });
});
