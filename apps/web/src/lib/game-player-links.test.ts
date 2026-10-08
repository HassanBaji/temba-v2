import { describe, expect, it } from "vitest";

import { gamePlayersLink, gameTeamPlayers } from "./game-player-links";

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

describe("gameTeamPlayers", () => {
  const gameTeams = [
    {
      id: "team-1",
      members: [
        { id: "u1", name: "Sofia L", image: null, position: "left" },
        {
          id: "u2",
          name: "Adam R",
          image: "https://img/u2",
          position: "right",
        },
      ],
    },
    { id: "team-2", members: [] },
  ];

  it("lists both players of a Game team", () => {
    expect(gameTeamPlayers(gameTeams, "team-1")).toEqual([
      { id: "u1", name: "Sofia L", image: null },
      { id: "u2", name: "Adam R", image: "https://img/u2" },
    ]);
  });

  it("lists nobody for an empty or unknown Game team", () => {
    expect(gameTeamPlayers(gameTeams, "team-2")).toEqual([]);
    expect(gameTeamPlayers(gameTeams, "missing")).toEqual([]);
  });
});
