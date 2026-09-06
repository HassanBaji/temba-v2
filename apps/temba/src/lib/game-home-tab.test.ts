import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gameHomeTabFromQuery, gameHomeTabQuery } from "./game-home-tab";

describe("gameHomeTabFromQuery", () => {
  it("opens Results when tab=results", () => {
    assert.equal(gameHomeTabFromQuery("results"), "results");
  });

  it("opens Players when tab=players", () => {
    assert.equal(gameHomeTabFromQuery("players"), "players");
  });

  it("defaults to Overview otherwise", () => {
    assert.equal(gameHomeTabFromQuery(undefined), "overview");
    assert.equal(gameHomeTabFromQuery(null), "overview");
    assert.equal(gameHomeTabFromQuery(""), "overview");
    assert.equal(gameHomeTabFromQuery("overview"), "overview");
    assert.equal(gameHomeTabFromQuery("score"), "overview");
  });
});

describe("gameHomeTabQuery", () => {
  it("omits the query for Overview", () => {
    assert.equal(gameHomeTabQuery("overview"), "");
  });

  it("writes tab for Players and Results", () => {
    assert.equal(gameHomeTabQuery("players"), "?tab=players");
    assert.equal(gameHomeTabQuery("results"), "?tab=results");
  });
});
