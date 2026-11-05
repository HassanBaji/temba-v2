import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letters of the first and last names", () => {
    assert.equal(initials("Sofia Lindqvist"), "SL");
    assert.equal(initials("sofia"), "S");
    assert.equal(initials("  "), "?");
  });

  it("reads an Arabic name past the article", () => {
    assert.equal(initials("أحمد الخليفة"), "أخ");
    assert.equal(initials("الحسن علي"), "حع");
  });
});
