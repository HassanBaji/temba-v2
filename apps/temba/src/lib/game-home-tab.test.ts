import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gameHomeTabFromQuery } from "./game-home-tab";

describe("gameHomeTabFromQuery", () => {
  it("opens Results when tab=results", () => {
    assert.equal(gameHomeTabFromQuery("results"), "results");
  });

  it("defaults to Overview otherwise", () => {
    assert.equal(gameHomeTabFromQuery(undefined), "overview");
    assert.equal(gameHomeTabFromQuery(null), "overview");
    assert.equal(gameHomeTabFromQuery("players"), "overview");
    assert.equal(gameHomeTabFromQuery("overview"), "overview");
  });
});
