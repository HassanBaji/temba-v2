import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeStateLine } from "./home-state-line";

describe("homeStateLine", () => {
  it("prefers invites over booked games", () => {
    assert.equal(homeStateLine(2, 3), "Two invites waiting");
  });

  it("uses singular invite copy", () => {
    assert.equal(homeStateLine(1, 4), "One invite waiting");
  });

  it("falls back to booked games when no invites", () => {
    assert.equal(homeStateLine(0, 2), "Two games booked");
    assert.equal(homeStateLine(0, 1), "One game booked");
  });

  it("renders nothing when neither applies", () => {
    assert.equal(homeStateLine(0, 0), null);
  });
});
