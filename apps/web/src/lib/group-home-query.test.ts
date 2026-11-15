import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  groupHomeTabQueryValue,
  groupPlayedFilterFromQuery,
  groupPlayedFilterQueryValue,
  patchGroupHomeQuery,
} from "./group-home-query";

describe("groupHomeTabQueryValue", () => {
  it("leaves Standing, the default tab, out of the URL", () => {
    assert.equal(groupHomeTabQueryValue("standing"), null);
    assert.equal(groupHomeTabQueryValue("games"), "games");
  });
});

describe("groupPlayedFilterFromQuery", () => {
  it("reads a known filter", () => {
    assert.equal(groupPlayedFilterFromQuery("needs_score"), "needs_score");
    assert.equal(groupPlayedFilterFromQuery("all"), "all");
  });

  it("falls back to Finished for a missing or unknown value", () => {
    assert.equal(groupPlayedFilterFromQuery(null), "finished");
    assert.equal(groupPlayedFilterFromQuery("upcoming"), "finished");
  });
});

describe("groupPlayedFilterQueryValue", () => {
  it("leaves the default out of the URL", () => {
    assert.equal(groupPlayedFilterQueryValue("finished"), null);
    assert.equal(groupPlayedFilterQueryValue("cancelled"), "cancelled");
  });
});

describe("patchGroupHomeQuery", () => {
  it("sets a key and keeps the others", () => {
    assert.equal(
      patchGroupHomeQuery("?tab=games", { played: "all" }),
      "?tab=games&played=all",
    );
  });

  it("replaces a key in place", () => {
    assert.equal(
      patchGroupHomeQuery("?tab=games&played=all", { tab: "members" }),
      "?tab=members&played=all",
    );
  });

  it("drops a key set to null or an empty string", () => {
    assert.equal(
      patchGroupHomeQuery("?tab=members&search=sa&saved=u1", {
        search: "",
        saved: null,
      }),
      "?tab=members",
    );
  });

  it("returns an empty string when nothing is left", () => {
    assert.equal(patchGroupHomeQuery("?tab=games", { tab: null }), "");
  });

  it("encodes a search query", () => {
    assert.equal(
      patchGroupHomeQuery("", { search: "al & bo" }),
      "?search=al+%26+bo",
    );
  });
});
