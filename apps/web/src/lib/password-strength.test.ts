import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  isPasswordLongEnough,
  passwordStrength,
  passwordStrengthLabel,
  PASSWORD_STRENGTH_SEGMENTS,
} from "./password-strength";

describe("passwordStrength", () => {
  it("fills nothing for an empty password", () => {
    assert.equal(passwordStrength(""), 0);
  });

  it("fills one segment at eight plain letters", () => {
    assert.equal(passwordStrength("abcdefgh"), 1);
  });

  it("adds a segment each for a number, a symbol and twelve characters", () => {
    assert.equal(passwordStrength("abcdefg1"), 2);
    assert.equal(passwordStrength("abcdefg1!"), 3);
    assert.equal(passwordStrength("abcdefg1!xyz"), PASSWORD_STRENGTH_SEGMENTS);
  });

  it("counts a number or symbol even before the minimum length", () => {
    assert.equal(passwordStrength("ab1!"), 2);
  });

  it("never exceeds the segment count", () => {
    assert.ok(
      passwordStrength("a-very-long-passphrase-9!") <=
        PASSWORD_STRENGTH_SEGMENTS,
    );
  });
});

describe("isPasswordLongEnough", () => {
  it("gates the button at eight characters", () => {
    assert.equal(isPasswordLongEnough("abcdefg"), false);
    assert.equal(isPasswordLongEnough("abcdefgh"), true);
  });
});

describe("passwordStrengthLabel", () => {
  it("says too short until the minimum length, whatever else is in it", () => {
    assert.equal(passwordStrengthLabel("", "en"), "Too short");
    assert.equal(passwordStrengthLabel("ab1!", "en"), "Too short");
  });

  it("names the filled segments", () => {
    assert.equal(passwordStrengthLabel("abcdefgh", "en"), "Weak");
    assert.equal(passwordStrengthLabel("abcdefg1", "en"), "Fair");
    assert.equal(passwordStrengthLabel("abcdefg1!", "en"), "Good");
    assert.equal(passwordStrengthLabel("abcdefg1!xyz", "en"), "Strong");
  });
});
