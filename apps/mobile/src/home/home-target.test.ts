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
    assert.equal(homePath({ kind: "groups" }), "/groups");
    assert.equal(
      homePath({ kind: "marks", userId: "u1", sport: "football" }),
      "/players/u1/marks?sport=football",
    );
    assert.equal(homePath({ kind: "create-game" }), "/games/new");
    assert.equal(homePath({ kind: "create-group" }), "/groups/new");
    assert.equal(homePath({ kind: "browse-games" }), "/games");
    assert.equal(
      homePath({ kind: "booking", bookingId: "b1" }),
      "/book/bookings/b1",
    );
    assert.equal(
      homePath({ kind: "booking-payment", bookingId: "b1" }),
      "/book/bookings/b1/payment",
    );
    assert.equal(
      homePath({ kind: "booking-game", bookingId: "b1" }),
      "/book/bookings/b1/game",
    );
    assert.equal(homePath({ kind: "book", sport: "padel" }), "/book");
    assert.equal(
      homePath({ kind: "book", sport: "football" }),
      "/book?sport=football",
    );
    assert.equal(homePath({ kind: "invites" }), "/profile/invites");
    assert.equal(homePath({ kind: "notifications" }), "/notifications");
    assert.equal(
      homePath({ kind: "profile-task", task: "email" }),
      "/complete-profile/email",
    );
    assert.equal(homePath({ kind: "complete-profile" }), "/complete-profile");
  });
});
