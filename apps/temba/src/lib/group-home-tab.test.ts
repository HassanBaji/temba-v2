import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { groupHomeTabFromQuery, groupHomeTabQuery } from "./group-home-tab";

describe("groupHomeTabFromQuery", () => {
  it("opens Games when tab=games", () => {
    assert.equal(groupHomeTabFromQuery("games"), "games");
  });

  it("opens Members when tab=members", () => {
    assert.equal(groupHomeTabFromQuery("members"), "members");
  });

  it("defaults to Standing otherwise", () => {
    assert.equal(groupHomeTabFromQuery(undefined), "standing");
    assert.equal(groupHomeTabFromQuery(null), "standing");
    assert.equal(groupHomeTabFromQuery(""), "standing");
    assert.equal(groupHomeTabFromQuery("standing"), "standing");
    assert.equal(groupHomeTabFromQuery("score"), "standing");
  });
});

describe("groupHomeTabQuery", () => {
  it("omits the query for Standing", () => {
    assert.equal(groupHomeTabQuery("standing"), "");
  });

  it("writes tab for Games and Members", () => {
    assert.equal(groupHomeTabQuery("games"), "?tab=games");
    assert.equal(groupHomeTabQuery("members"), "?tab=members");
  });
});
