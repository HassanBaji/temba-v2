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

  it("opens the member's own Points and history for a Tier adjustment", () => {
    assert.equal(
      notificationHref({ type: "tier_points_adjusted", group: { id: "g1" } }),
      "/dashboard/groups/g1/points",
    );
    assert.equal(
      notificationHref({ type: "tier_band_changed", group: { id: "g1" } }),
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

  it("opens the Game a Game leave is about", () => {
    assert.equal(
      notificationHref({
        type: "game_player_left",
        group: null,
        game: { id: "x2" },
      }),
      "/dashboard/games/x2",
    );
  });

  it("opens the Game an Organizer seated the player on", () => {
    assert.equal(
      notificationHref({
        type: "game_seated_by_organizer",
        group: null,
        game: { id: "x4" },
      }),
      "/dashboard/games/x4",
    );
  });

  it("opens the Game a Finished Game is about", () => {
    assert.equal(
      notificationHref({
        type: "game_finished",
        group: { id: "g1" },
        game: { id: "x3" },
      }),
      "/dashboard/games/x3",
    );
    assert.equal(
      notificationHref({ type: "game_finished", group: null, game: null }),
      null,
    );
  });

  it("opens the Game a received mark came from", () => {
    assert.equal(
      notificationHref({
        type: "mark_received",
        group: null,
        game: { id: "x5" },
      }),
      "/dashboard/games/x5",
    );
  });

  it("opens the Game an MVP notification is about", () => {
    for (const type of ["mvp_decided", "mvp_tie_break"]) {
      assert.equal(
        notificationHref({ type, group: null, game: { id: "x6" } }),
        "/dashboard/games/x6",
      );
    }
  });

  it("opens Match history for a claimed history", () => {
    assert.equal(
      notificationHref({ type: "history_linked", group: null, game: null }),
      "/dashboard/games?tab=history",
    );
  });

  it("opens Challenges, Teams for a Team invite, where the invite is accepted", () => {
    assert.equal(
      notificationHref({ type: "team_invite_received", group: null }),
      "/dashboard/challenges?tab=teams",
    );
  });

  it("opens Challenges, Mine for an expired Challenge", () => {
    assert.equal(
      notificationHref({ type: "challenge_expired", group: null }),
      "/dashboard/challenges?tab=mine",
    );
  });

  it("opens the Challenge a Proposal was received, declined, expired or passed over on, or a Rematch nudged, and the Game a confirm or squad reminder is about", () => {
    for (const type of [
      "challenge_proposal_received",
      "challenge_proposal_declined",
      "challenge_proposal_expired",
      "challenge_proposal_passed_over",
      "challenge_rematch_nudge",
    ]) {
      assert.equal(
        notificationHref({ type, group: null, challenge: { id: "c1" } }),
        "/dashboard/challenges/c1",
      );
    }
    for (const type of [
      "challenge_proposal_confirmed",
      "challenge_squad_due",
      "challenge_squad_named",
    ]) {
      assert.equal(
        notificationHref({
          type,
          group: null,
          game: { id: "g1" },
          challenge: { id: "c1" },
        }),
        "/dashboard/games/g1",
      );
    }
    assert.equal(
      notificationHref({ type: "challenge_proposal_received", group: null }),
      null,
    );
  });

  it("opens Rate the game when ratings open for the Organizer", () => {
    assert.equal(
      notificationHref({
        type: "performance_ratings_open",
        group: { id: "g2" },
        game: { id: "g1" },
      }),
      "/dashboard/games/g1/rate",
    );
  });

  it("opens the Game when ratings close", () => {
    assert.equal(
      notificationHref({
        type: "performance_ratings_closed",
        group: { id: "g2" },
        game: { id: "g1" },
      }),
      "/dashboard/games/g1",
    );
  });

  it("opens the Group a Level set was made in", () => {
    assert.equal(
      notificationHref({ type: "level_set", group: { id: "g2" } }),
      "/dashboard/groups/g2",
    );
    assert.equal(notificationHref({ type: "level_set", group: null }), null);
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
