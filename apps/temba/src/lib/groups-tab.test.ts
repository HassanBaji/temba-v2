import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { groupsTabFromQuery, groupsTabQuery } from "./groups-tab";

describe("groupsTabFromQuery", () => {
  it("opens Public when tab=public", () => {
    assert.equal(groupsTabFromQuery("public"), "public");
  });

  it("defaults to Mine otherwise", () => {
    assert.equal(groupsTabFromQuery(undefined), "mine");
    assert.equal(groupsTabFromQuery(null), "mine");
    assert.equal(groupsTabFromQuery(""), "mine");
    assert.equal(groupsTabFromQuery("history"), "mine");
    assert.equal(groupsTabFromQuery("mine"), "mine");
  });
});

describe("groupsTabQuery", () => {
  it("omits the query for Mine", () => {
    assert.equal(groupsTabQuery("mine"), "");
  });

  it("writes tab for Public", () => {
    assert.equal(groupsTabQuery("public"), "?tab=public");
  });
});
