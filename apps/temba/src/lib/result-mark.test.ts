import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { RESULT_MARK_LABEL, resultMarkVariant } from "./result-mark";

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

describe("RESULT_MARK_LABEL", () => {
  it("announces a draw as a draw, never as a loss", () => {
    assert.equal(RESULT_MARK_LABEL[resultMarkVariant("draw")], "Draw");
    assert.equal(RESULT_MARK_LABEL[resultMarkVariant("lost")], "Lost");
    assert.equal(RESULT_MARK_LABEL[resultMarkVariant("won")], "Won");
    assert.equal(RESULT_MARK_LABEL[resultMarkVariant(null)], "Not played");
  });
});
