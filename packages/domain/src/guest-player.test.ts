import { describe, expect, it } from "vitest";

import { guestStandInBand, guestStandInState } from "./guest-player";
import { muFromLevel, type RatingGlickoState } from "./level";

function state(level: number, phi = 100): RatingGlickoState {
  return { mu: muFromLevel(level), phi, sigma: 0.06, levelBand: "C2" };
}

describe("guestStandInState", () => {
  it("is the mean of the players with an account", () => {
    const standIn = guestStandInState([
      state(3.3, 80),
      state(3.1, 120),
      state(2.9, 100),
    ]);
    expect(standIn?.mu).toBeCloseTo(muFromLevel(3.1));
    expect(standIn?.phi).toBeCloseTo(100);
    expect(standIn?.sigma).toBeCloseTo(0.06);
  });

  it("takes the band of the mean Level", () => {
    expect(guestStandInState([state(1.05), state(1.05)])?.levelBand).toBe("D2");
  });

  it("is the one player's Rating when only one has an account", () => {
    const only = state(4.2, 90);
    expect(guestStandInState([only])).toMatchObject({
      mu: only.mu,
      phi: only.phi,
    });
  });

  it("is null with nobody to average", () => {
    expect(guestStandInState([])).toBeNull();
  });
});

describe("guestStandInBand", () => {
  it("is the mean band of the players who have one", () => {
    expect(guestStandInBand(["C3", "C1", null])).toBe("C2");
  });

  it("is null when nobody has a band", () => {
    expect(guestStandInBand([null, null])).toBeNull();
    expect(guestStandInBand([])).toBeNull();
  });
});
