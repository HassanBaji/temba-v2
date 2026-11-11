import { describe, expect, it } from "vitest";

import { notificationPath } from "./notification-path";

const group = { id: "g1" };
const game = { id: "x1" };
const challenge = { id: "c1" };

describe("notificationPath", () => {
  it("opens the Group for Group notifications", () => {
    expect(notificationPath({ type: "group_member_joined", group })).toBe(
      "/groups/g1",
    );
    expect(notificationPath({ type: "level_set", group })).toBe("/groups/g1");
    expect(notificationPath({ type: "tier_band_changed", group })).toBe(
      "/groups/g1",
    );
  });

  it("opens the member's own Points and history for a Tier adjustment", () => {
    expect(notificationPath({ type: "tier_points_adjusted", group })).toBe(
      "/groups/tier-history?groupId=g1",
    );
    expect(
      notificationPath({ type: "group_join_approved", group, game: null }),
    ).toBe("/groups/g1");
  });

  it("opens the Game when a join request came through a Game", () => {
    expect(
      notificationPath({ type: "group_join_requested", group, game }),
    ).toBe("/games/x1");
  });

  it("opens the Game for Game notifications", () => {
    for (const type of [
      "game_player_joined",
      "match_score_to_confirm",
      "mvp_decided",
      "challenge_squad_due",
    ]) {
      expect(notificationPath({ type, group: null, game })).toBe("/games/x1");
    }
  });

  it("opens Challenges for Challenge notifications", () => {
    expect(
      notificationPath({
        type: "challenge_proposal_received",
        group: null,
        challenge,
      }),
    ).toBe("/challenges/c1");
    expect(
      notificationPath({ type: "team_invite_received", group: null }),
    ).toBe("/challenges?tab=teams");
    expect(notificationPath({ type: "challenge_expired", group: null })).toBe(
      "/challenges?tab=mine",
    );
  });

  it("opens the Games history for linked history", () => {
    expect(notificationPath({ type: "history_linked", group: null })).toBe(
      "/games?tab=history",
    );
  });

  it("has no target when the subject is missing or the type is unknown", () => {
    expect(notificationPath({ type: "game_finished", group: null })).toBeNull();
    expect(
      notificationPath({ type: "challenge_proposal_received", group: null }),
    ).toBeNull();
    expect(notificationPath({ type: "something_new", group })).toBeNull();
  });
});
