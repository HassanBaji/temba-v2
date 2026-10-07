import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { notificationHref } from "./notification-href";

describe("notificationHref", () => {
  it("opens the Group a Group join is about", () => {
    assert.equal(
      notificationHref({ type: "group_member_joined", group: { id: "g1" } }),
      "/dashboard/groups/g1",
    );
  });

  it("opens the Game a Game join is about", () => {
    assert.equal(
      notificationHref({
        type: "game_player_joined",
        group: { id: "g1" },
        game: { id: "x1" },
      }),
      "/dashboard/games/x1",
    );
    assert.equal(
      notificationHref({ type: "game_player_joined", group: null, game: null }),
      null,
    );
  });

  it("has no target without a Group or for a type it does not know", () => {
    assert.equal(
      notificationHref({ type: "group_member_joined", group: null }),
      null,
    );
    assert.equal(
      notificationHref({ type: "something_new", group: { id: "g1" } }),
      null,
    );
  });
});
