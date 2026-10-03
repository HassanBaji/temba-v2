import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { visibleAppNavSlots } from "./app-nav-visibility";

describe("visibleAppNavSlots", () => {
  it("omits Communities when the create-access flag is false", () => {
    assert.deepEqual(visibleAppNavSlots(false), [
      "home",
      "games",
      "groups",
      "you",
    ]);
  });

  it("includes Communities when the create-access flag is true", () => {
    assert.deepEqual(visibleAppNavSlots(true), [
      "home",
      "games",
      "groups",
      "communities",
      "you",
    ]);
  });

  it("keeps Groups and Communities as two destinations when the flag is true", () => {
    const slots = visibleAppNavSlots(true);
    assert.equal(slots.includes("groups"), true);
    assert.equal(slots.includes("communities"), true);
  });

  it("does not add a replacement fifth item when Communities is omitted", () => {
    assert.equal(visibleAppNavSlots(false).length, 4);
    assert.equal(visibleAppNavSlots(true).length, 5);
  });
});
