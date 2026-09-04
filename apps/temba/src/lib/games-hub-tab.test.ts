import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gamesHubTabFromQuery, gamesHubTabQuery } from "./games-hub-tab";

describe("gamesHubTabFromQuery", () => {
  it("opens History when tab=history", () => {
    assert.equal(gamesHubTabFromQuery("history"), "history");
  });

  it("opens Public when tab=public", () => {
    assert.equal(gamesHubTabFromQuery("public"), "public");
  });

  it("defaults to My Games otherwise", () => {
    assert.equal(gamesHubTabFromQuery(undefined), "my-games");
    assert.equal(gamesHubTabFromQuery(null), "my-games");
    assert.equal(gamesHubTabFromQuery(""), "my-games");
    assert.equal(gamesHubTabFromQuery("results"), "my-games");
    assert.equal(gamesHubTabFromQuery("my-games"), "my-games");
  });
});

describe("gamesHubTabQuery", () => {
  it("omits the query for My Games", () => {
    assert.equal(gamesHubTabQuery("my-games"), "");
  });

  it("writes tab for History and Public", () => {
    assert.equal(gamesHubTabQuery("history"), "?tab=history");
    assert.equal(gamesHubTabQuery("public"), "?tab=public");
  });
});
