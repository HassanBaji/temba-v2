import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeStateLine } from "./home-state-line";

describe("homeStateLine", () => {
  it("prefers invites over booked games", () => {
    assert.equal(homeStateLine(2, 3, "en"), "Two invites waiting");
  });

  it("uses singular invite copy", () => {
    assert.equal(homeStateLine(1, 4, "en"), "One invite waiting");
  });

  it("falls back to booked games when no invites", () => {
    assert.equal(homeStateLine(0, 2, "en"), "Two games booked");
    assert.equal(homeStateLine(0, 1, "en"), "One game booked");
  });

  it("reads in Arabic", () => {
    assert.equal(homeStateLine(2, 3, "ar"), "دعوتان بانتظارك");
    assert.equal(homeStateLine(0, 5, "ar"), "5 ألعاب محجوزة");
  });

  it("renders nothing when neither applies", () => {
    assert.equal(homeStateLine(0, 0, "en"), null);
  });
});
