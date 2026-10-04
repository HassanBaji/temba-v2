import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homePath } from "./home-target";

describe("homePath", () => {
  it("maps each Home target to a mobile route", () => {
    assert.equal(homePath({ kind: "game", gameId: "g1" }), "/games/g1");
    assert.equal(
      homePath({ kind: "game", gameId: "g1", intent: "results" }),
      "/games/g1?intent=results",
    );
    assert.equal(homePath({ kind: "group", groupId: "x" }), "/groups/x");
    assert.equal(homePath({ kind: "create-game" }), "/games/new");
    assert.equal(homePath({ kind: "create-group" }), "/groups/new");
    assert.equal(homePath({ kind: "browse-games" }), "/games");
  });
});
