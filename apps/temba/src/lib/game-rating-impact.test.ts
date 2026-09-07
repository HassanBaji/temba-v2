import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  ratingImpactChangeDirection,
  ratingImpactChangeMagnitude,
  ratingImpactStandingSentence,
} from "./game-rating-impact";

describe("ratingImpactChangeMagnitude", () => {
  it("formats a drop as an unsigned one-decimal figure", () => {
    assert.equal(ratingImpactChangeMagnitude(-0.3), "0.3");
  });

  it("formats a rise as an unsigned one-decimal figure", () => {
    assert.equal(ratingImpactChangeMagnitude(0.3), "0.3");
  });

  it("formats no change as 0.0", () => {
    assert.equal(ratingImpactChangeMagnitude(0), "0.0");
  });
});

describe("ratingImpactChangeDirection", () => {
  it("reads a positive change as up", () => {
    assert.equal(ratingImpactChangeDirection(0.2), "up");
  });

  it("reads a negative change as down", () => {
    assert.equal(ratingImpactChangeDirection(-0.2), "down");
  });

  it("reads zero as flat", () => {
    assert.equal(ratingImpactChangeDirection(0), "flat");
  });
});

describe("ratingImpactStandingSentence", () => {
  it("uses 'about' and 'confirms', never a hard promise, while Provisional", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 4,
    });
    assert.equal(
      sentence,
      "Still C. About 4 more rated games and your level confirms.",
    );
  });

  it("uses singular 'game' when exactly one remains", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 1,
    });
    assert.match(sentence, /1 more rated game and/);
  });

  it("floors a missing remaining-count at 1 rather than reading '0 more'", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "D1",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: null,
    });
    assert.match(sentence, /1 more rated game and/);
  });

  it("never says 'locks in' once confirmed", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "B1",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
    });
    assert.doesNotMatch(sentence, /locks in/i);
    assert.match(sentence, /confirmed/i);
  });

  it("renders the display-remapped band label, not the raw stored band", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "D2",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
    });
    assert.match(sentence, /^Still D\. /);
  });
});
