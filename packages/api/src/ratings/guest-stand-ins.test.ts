import { describe, expect, it } from "vitest";

import { muFromLevel, type RatingGlickoState } from "@repo/domain/level";

import {
  guestStandInState,
  withGuestStandIns,
} from "#src/ratings/guest-stand-ins";

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

  it("is null with nobody to average", () => {
    expect(guestStandInState([])).toBeNull();
  });
});

describe("withGuestStandIns", () => {
  const states: Record<string, RatingGlickoState> = {
    a: state(4),
    b: state(3),
    c: state(2),
    d: state(1),
  };
  const lastRatedAt = new Date("2026-11-01T00:00:00Z");
  const own = (userId: string) => ({ state: states[userId]!, lastRatedAt });

  it("leaves every player as they are with no guest", () => {
    const input = withGuestStandIns(["a", "b", "c", "d"], new Set(), own);
    expect(input("d")).toEqual(own("d"));
  });

  it("puts two guests at the mean of the two players with an account", () => {
    const input = withGuestStandIns(
      ["a", "b", "c", "d"],
      new Set(["b", "d"]),
      own,
    );
    expect(input("a")).toEqual(own("a"));
    expect(input("b").state.mu).toBeCloseTo(muFromLevel(3));
    expect(input("d").state.mu).toBeCloseTo(muFromLevel(3));
    expect(input("d").lastRatedAt).toBeNull();
  });

  it("puts three guests at the one player's own Rating", () => {
    const input = withGuestStandIns(
      ["a", "b", "c", "d"],
      new Set(["b", "c", "d"]),
      own,
    );
    expect(input("c").state.mu).toBeCloseTo(states.a!.mu);
    expect(input("c").state.phi).toBeCloseTo(states.a!.phi);
  });
});
