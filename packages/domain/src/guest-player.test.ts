import { describe, expect, it } from "vitest";

import { guestStandInBand } from "./guest-player";

describe("guestStandInBand", () => {
  it("is the mean band of the players who have one", () => {
    expect(guestStandInBand(["C3", "C1", null])).toBe("C2");
  });

  it("is null when nobody has a band", () => {
    expect(guestStandInBand([null, null])).toBeNull();
    expect(guestStandInBand([])).toBeNull();
  });
});
