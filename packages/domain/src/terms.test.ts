import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { TERMS_UPDATED, termsUpdatedLabel } from "./terms";

describe("termsUpdatedLabel", () => {
  it("stores an ISO date", () => {
    assert.match(TERMS_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("writes the date in the reader's language", () => {
    assert.equal(termsUpdatedLabel("en"), "12 November 2026");
    assert.equal(termsUpdatedLabel("ar"), "12 نوفمبر 2026");
  });
});
