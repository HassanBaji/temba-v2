import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { confirmationFraction, lastMatchMovement } from "./profile-level";

describe("confirmationFraction", () => {
  it("is rated matches over rated matches plus remaining", () => {
    assert.equal(confirmationFraction(13, 7), 0.65);
    assert.equal(confirmationFraction(1, 1), 0.5);
  });

  it("is 0 when no rated matches have been played", () => {
    assert.equal(confirmationFraction(0, 5), 0);
  });

  it("is 1 when no rated matches remain", () => {
    assert.equal(confirmationFraction(5, 0), 1);
  });

  it("does not clamp like Home plottedFraction", () => {
    assert.equal(confirmationFraction(1, 20), 1 / 21);
    assert.equal(confirmationFraction(8, 1), 8 / 9);
  });

  it("is 0 when both sides are 0", () => {
    assert.equal(confirmationFraction(0, 0), 0);
  });
});

describe("lastMatchMovement", () => {
  it("is omitted with fewer than two history points", () => {
    assert.equal(lastMatchMovement([]), null);
    assert.equal(lastMatchMovement(["3.4"]), null);
  });

  it("reads up, down, and held from the last two points", () => {
    assert.equal(lastMatchMovement(["3.4", "3.5"]), "up");
    assert.equal(lastMatchMovement(["3.5", "3.4"]), "down");
    assert.equal(lastMatchMovement(["3.4", "3.4"]), "held");
  });

  it("compares only the last two points at display precision", () => {
    assert.equal(lastMatchMovement(["3.0", "3.2", "3.1"]), "down");
    assert.equal(lastMatchMovement(["3.40", "3.4"]), "held");
  });
});
