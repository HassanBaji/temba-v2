import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeNoGamesCopy, homeNoGamesCreateAction } from "./home-no-games";

describe("homeNoGamesCreateAction", () => {
  it("hides create when the viewer cannot create Groups", () => {
    assert.equal(
      homeNoGamesCreateAction({
        hasCreateAccess: false,
        createGroupCount: 2,
      }),
      null,
    );
  });

  it("sends group creators to Create Group when they have no Group", () => {
    assert.deepEqual(
      homeNoGamesCreateAction({
        hasCreateAccess: true,
        createGroupCount: 0,
      }),
      {
        kind: "group",
        target: { kind: "create-group" },
        label: "Create Group",
      },
    );
  });

  it("sends group creators to the single Create route when they have a Group", () => {
    assert.deepEqual(
      homeNoGamesCreateAction({
        hasCreateAccess: true,
        createGroupCount: 1,
      }),
      {
        kind: "game",
        target: { kind: "create-game" },
        label: "Create",
      },
    );
  });
});

describe("homeNoGamesCopy", () => {
  it("asks for a Group first when the viewer has none", () => {
    assert.equal(
      homeNoGamesCopy({
        kind: "group",
        target: { kind: "create-group" },
        label: "Create Group",
      }),
      "Create a Group first, then you can create a Game.",
    );
  });

  it("points everyone else at browsing", () => {
    assert.equal(homeNoGamesCopy(null), "Browse available games.");
  });
});
