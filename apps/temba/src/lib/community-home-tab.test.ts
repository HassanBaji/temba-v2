import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  communityHomeTabFromQuery,
  communityHomeTabQuery,
  type CommunityHomeTab,
} from "./community-home-tab";

const ALL: CommunityHomeTab[] = ["groups", "teams", "members", "requests"];

describe("communityHomeTabFromQuery", () => {
  it("opens the requested tab when the viewer can see it", () => {
    assert.equal(communityHomeTabFromQuery("teams", ALL), "teams");
    assert.equal(communityHomeTabFromQuery("members", ALL), "members");
    assert.equal(communityHomeTabFromQuery("requests", ALL), "requests");
    assert.equal(communityHomeTabFromQuery("groups", ALL), "groups");
  });

  it("defaults to Groups when the tab is missing or unknown", () => {
    assert.equal(communityHomeTabFromQuery(undefined, ALL), "groups");
    assert.equal(communityHomeTabFromQuery(null, ALL), "groups");
    assert.equal(communityHomeTabFromQuery("", ALL), "groups");
    assert.equal(communityHomeTabFromQuery("standing", ALL), "groups");
  });

  it("falls back to Groups when the viewer cannot see the tab", () => {
    assert.equal(communityHomeTabFromQuery("members", ["groups"]), "groups");
    assert.equal(
      communityHomeTabFromQuery("requests", ["groups", "teams", "members"]),
      "groups",
    );
  });
});

describe("communityHomeTabQuery", () => {
  it("omits the query for Groups", () => {
    assert.equal(communityHomeTabQuery("groups"), "");
  });

  it("writes tab for the other tabs", () => {
    assert.equal(communityHomeTabQuery("teams"), "?tab=teams");
    assert.equal(communityHomeTabQuery("members"), "?tab=members");
    assert.equal(communityHomeTabQuery("requests"), "?tab=requests");
  });
});
