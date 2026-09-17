import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeNoGamesCreateAction } from "./home-no-games";

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
        href: "/dashboard/groups/new",
        label: "Create Group",
      },
    );
  });

  it("sends group creators to Create Game when they have a Group", () => {
    assert.deepEqual(
      homeNoGamesCreateAction({
        hasCreateAccess: true,
        createGroupCount: 1,
      }),
      {
        kind: "game",
        href: "/dashboard/games/new",
        label: "Create Game",
      },
    );
  });
});
