import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { nextJoinPosition } from "./game-card-side-join";

const someone = { name: "Ada" };

describe("nextJoinPosition", () => {
  it("seats left first on an empty side", () => {
    assert.equal(nextJoinPosition({ left: null, right: null }), "left");
  });

  it("seats the remaining right when left is occupied", () => {
    assert.equal(nextJoinPosition({ left: someone, right: null }), "right");
  });

  it("seats the remaining left when right is occupied", () => {
    assert.equal(nextJoinPosition({ left: null, right: someone }), "left");
  });

  it("is not joinable when both Positions are occupied", () => {
    assert.equal(nextJoinPosition({ left: someone, right: someone }), null);
  });
});
