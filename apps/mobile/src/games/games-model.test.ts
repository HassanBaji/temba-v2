import { createGamesHubFixtures } from "@repo/domain/games-hub-fixtures";
import { describe, expect, it } from "vitest";

import { hubItems, seatJoinRequest, waitlistJoinRequest } from "./games-model";

const fixtures = createGamesHubFixtures(new Date("2026-10-04T10:00:00Z"));

describe("hubItems", () => {
  it("shows a drawn tournament as its Match rows and keeps the card for the tournament itself", () => {
    expect(
      hubItems(fixtures.tournamentMatches.myGames).map((item) => item.kind),
    ).toEqual(["match", "match", "match", "tournament"]);
  });

  it("plans a Join on an open Friendly roster", () => {
    const [first] = hubItems(fixtures.mixed.myGames);
    expect(first?.kind).toBe("game");
    expect(first?.kind === "game" && first.plan.primaryAction).toBe("join");
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

  it("joins any other waitlist without choosing a seat", () => {
    expect(waitlistJoinRequest({ id: "g1", format: "friendly_game" })).toEqual({
      door: "registerSeat",
      input: { gameId: "g1" },
    });
  });
});
