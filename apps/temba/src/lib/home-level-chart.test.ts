import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { chartPointGeometry, plottedFraction } from "./home-level-chart";

describe("plottedFraction", () => {
  it("clamps zero rated matches to the 0.25 floor", () => {
    assert.equal(plottedFraction(0, 8), 0.25);
  });

  it("clamps a tiny played share to 0.25", () => {
    assert.equal(plottedFraction(1, 20), 0.25);
  });

  it("clamps a large played share to 0.75", () => {
    assert.equal(plottedFraction(8, 1), 0.75);
  });

  it("shrinks when ratedMatchesRemaining rises after idle inflation", () => {
    assert.equal(plottedFraction(4, 4), 0.5);
    assert.equal(plottedFraction(4, 6), 0.4);
  });
});

describe("chartPointGeometry", () => {
  it("returns no points for zero matches", () => {
    assert.deepEqual(chartPointGeometry([], 40, 58), []);
  });

  it("places a single point in the plotted region", () => {
    const points = chartPointGeometry([3.4], 40, 58);
    assert.equal(points.length, 1);
    assert.equal(points[0]?.x, 20);
  });
});
