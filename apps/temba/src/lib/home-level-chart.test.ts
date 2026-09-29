import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  chartPointGeometry,
  levelChangeView,
  plottedFraction,
} from "./home-level-chart";

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

describe("levelChangeView", () => {
  it("names an upward change", () => {
    assert.deepEqual(levelChangeView(0.3), {
      direction: "up",
      amount: "0.3",
      spoken: "Up",
    });
  });

  it("names a downward change without a minus sign in the amount", () => {
    assert.deepEqual(levelChangeView(-0.4), {
      direction: "down",
      amount: "0.4",
      spoken: "Down",
    });
  });

  it("treats a change that rounds to 0.0 as no change", () => {
    assert.deepEqual(levelChangeView(0), {
      direction: "none",
      amount: "0.0",
      spoken: "No change",
    });
    assert.equal(levelChangeView(-0.04).direction, "none");
  });
});
