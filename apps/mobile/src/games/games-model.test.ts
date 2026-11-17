import { createGamesHubFixtures } from "@repo/domain/games-hub-fixtures";
import { describe, expect, it } from "vitest";

import {
  hubItems,
  joinsAlone,
  seatJoinRequest,
  waitlistJoinRequest,
} from "./games-model";

const fixtures = createGamesHubFixtures(new Date("2026-10-04T10:00:00Z"));

const aloneTournament = {
  roundCount: 3,
  drawPosted: false,
  allowSoloRegister: true,
  teams: [],
  joinSides: [],
  alonePlayers: [],
  knockout: null,
};

describe("hubItems", () => {
  it("shows a drawn tournament as its Match rows and keeps the card for the tournament itself", () => {
    expect(
      hubItems(fixtures.tournamentMatches.myGames).map((item) => item.kind),
    ).toEqual(["match", "match", "match", "tournament"]);
  });

  it("shows a row carrying the viewer's tournament as one card", () => {
    const [row] = fixtures.tournamentMatches.myGames;
    if (!row) {
      throw new Error("Expected a tournament fixture row");
    }
    const myTournament = {
      viewerTeam: { left: null, right: null },
      poolLabel: "A",
      poolSize: 4,
      poolCount: 1,
      viewerPosition: null,
      poolFinished: false,
      winner: null,
      rounds: [],
    };
    expect(
      hubItems([{ ...row, matchId: null, myTournament }]).map(
        (item) => item.kind,
      ),
    ).toEqual(["my-tournament"]);
  });

  it("plans a Join on an open Friendly roster", () => {
    const [first] = hubItems(fixtures.mixed.myGames);
    expect(first?.kind).toBe("game");
    expect(first?.kind === "game" && first.plan.primaryAction).toBe("join");
  });
});

describe("joinsAlone", () => {
  it("is true only while an Alone-only Social lists players", () => {
    expect(joinsAlone({ tournament: aloneTournament })).toBe(true);
    expect(
      joinsAlone({ tournament: { ...aloneTournament, alonePlayers: null } }),
    ).toBe(false);
    expect(joinsAlone({ tournament: null })).toBe(false);
  });
});

describe("join requests", () => {
  it("seats a chosen side and position", () => {
    expect(seatJoinRequest("g1", 2, "right")).toEqual({
      door: "registerSeat",
      input: { gameId: "g1", sideIndex: 2, position: "right" },
    });
  });

  it("joins an Americano waitlist through register", () => {
    expect(waitlistJoinRequest({ id: "g1", format: "americano" }).door).toBe(
      "register",
    );
  });

  it("joins an Alone-only Social's waitlist through register", () => {
    expect(
      waitlistJoinRequest({
        id: "g1",
        format: "friendly_tournament",
        tournamentShape: "groups_only",
        tournament: aloneTournament,
      }).door,
    ).toBe("register");
  });

  it("joins any other waitlist without choosing a seat", () => {
    expect(waitlistJoinRequest({ id: "g1", format: "friendly_game" })).toEqual({
      door: "registerSeat",
      input: { gameId: "g1" },
    });
  });
});
