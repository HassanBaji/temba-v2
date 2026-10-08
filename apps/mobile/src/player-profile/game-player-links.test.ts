import { describe, expect, it } from "vitest";

import { gamePlayersLink } from "./game-player-links";

describe("gamePlayersLink", () => {
  it("links for a viewer on the Game", () => {
    expect(gamePlayersLink({ isRegistered: true, isGroupMember: false })).toBe(
      true,
    );
  });

  it("links for a member of the Game's Group who is not on it", () => {
    expect(gamePlayersLink({ isRegistered: false, isGroupMember: true })).toBe(
      true,
    );
  });

  it("does not link for a public browser, a waitlisted viewer or an Organizer outside the Group", () => {
    expect(gamePlayersLink({ isRegistered: false, isGroupMember: false })).toBe(
      false,
    );
  });
});
