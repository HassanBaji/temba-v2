import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { resultMarkLabel, resultMarkVariant } from "./result-mark";

describe("resultMarkVariant", () => {
  it("maps each Match outcome onto its own mark", () => {
    assert.equal(resultMarkVariant("won"), "won");
    assert.equal(resultMarkVariant("lost"), "lost");
    assert.equal(resultMarkVariant("draw"), "draw");
  });

  it("reads a missing outcome as not played", () => {
    assert.equal(resultMarkVariant(null), "not-played");
    assert.equal(resultMarkVariant(undefined), "not-played");
  });
});

describe("resultMarkLabel", () => {
  it("announces a draw as a draw, never as a loss", () => {
    assert.equal(resultMarkLabel(resultMarkVariant("draw"), "en"), "Draw");
    assert.equal(resultMarkLabel(resultMarkVariant("lost"), "en"), "Lost");
    assert.equal(resultMarkLabel(resultMarkVariant("won"), "en"), "Won");
    assert.equal(resultMarkLabel(resultMarkVariant(null), "en"), "Not played");
  });

  it("announces the marks in Arabic", () => {
    assert.equal(resultMarkLabel("draw", "ar"), "تعادل");
    assert.equal(resultMarkLabel("not-played", "ar"), "لم تُلعب");
  });
});
