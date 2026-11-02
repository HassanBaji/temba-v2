import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatPhoneForDisplay } from "./phone-display";

describe("formatPhoneForDisplay", () => {
  it("groups a known E.164 number the way the forms do", () => {
    assert.equal(formatPhoneForDisplay("+97336124408"), "+973 3612 4408");
  });

  it("returns the raw value for a number it cannot place", () => {
    assert.equal(formatPhoneForDisplay("+99912345"), "+99912345");
  });

  it("is null without a number", () => {
    assert.equal(formatPhoneForDisplay(null), null);
    assert.equal(formatPhoneForDisplay(undefined), null);
    assert.equal(formatPhoneForDisplay(""), null);
  });
});
