import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { shortPlayerName } from "./player-name";

describe("shortPlayerName", () => {
  it("keeps the first name and initials the surname", () => {
    assert.equal(shortPlayerName("Sofia Lindqvist"), "Sofia L");
    assert.equal(shortPlayerName("Ana Maria Santos"), "Ana S");
  });

  it("returns a single name unchanged", () => {
    assert.equal(shortPlayerName("Sofia"), "Sofia");
  });

  it("falls back to the raw value when there is no name to read", () => {
    assert.equal(shortPlayerName("   "), "   ");
  });
});
