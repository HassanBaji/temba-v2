import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { backSteps, trailFromHistoryState } from "./navigation-trail";

describe("backSteps", () => {
  it("goes back one entry to the page the player came from", () => {
    assert.equal(
      backSteps(["/dashboard", "/dashboard/groups/g1"], "/dashboard/games/x"),
      1,
    );
  });

  it("steps over a create flow to the page that opened it", () => {
    assert.equal(
      backSteps(
        [
          "/dashboard/groups/g1",
          "/dashboard/games/new",
          "/dashboard/games/new",
          "/dashboard/games/new",
        ],
        "/dashboard/games/x",
      ),
      4,
    );
  });

  it("steps over an editor and the earlier visit to the same page", () => {
    assert.equal(
      backSteps(
        [
          "/dashboard/groups/g1",
          "/dashboard/games/x",
          "/dashboard/games/x/score",
        ],
        "/dashboard/games/x",
      ),
      3,
    );
  });

  it("steps over Set Level back to the page before the Group", () => {
    assert.equal(
      backSteps(
        [
          "/dashboard/groups",
          "/dashboard/groups/g1",
          "/dashboard/groups/g1/members/u1",
        ],
        "/dashboard/groups/g1",
      ),
      3,
    );
  });

  it("ignores a trailing slash", () => {
    assert.equal(
      backSteps(
        ["/dashboard/groups/", "/dashboard/games/x/"],
        "/dashboard/games/x",
      ),
      2,
    );
  });

  it("falls back when the trail is empty", () => {
    assert.equal(backSteps([], "/dashboard/games/x"), null);
  });

  it("falls back rather than leave the Dashboard", () => {
    assert.equal(
      backSteps(["/dashboard/groups", "/login"], "/dashboard/games/x"),
      null,
    );
  });

  it("does not apply outside the Dashboard", () => {
    assert.equal(backSteps(["/"], "/login"), null);
  });
});

describe("trailFromHistoryState", () => {
  it("reads the trail Next.js history state carries", () => {
    assert.deepEqual(
      trailFromHistoryState({ __NA: true, __tembaTrail: ["/dashboard"] }),
      ["/dashboard"],
    );
  });

  it("is empty for an entry without a trail", () => {
    assert.deepEqual(trailFromHistoryState(null), []);
    assert.deepEqual(trailFromHistoryState({ __NA: true }), []);
    assert.deepEqual(trailFromHistoryState({ __tembaTrail: "x" }), []);
  });
});
