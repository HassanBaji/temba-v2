import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  canPostFinalOrder,
  clampKingCourts,
  finalOrderStillOpen,
  isKingOfTheCourt,
  kingCourtCount,
  kingCourtMoves,
  kingCourtsFromOrder,
  kingCourtTag,
  kingFinalOrderOf,
  kingFinishSlot,
  kingSlotPlayMinutes,
  kingFirstNames,
  kingPairName,
  kingPlayMinutesLabel,
  kingTeamCount,
  postedStartingOrder,
  shuffledOrder,
  startingCourtsOf,
  swapPositions,
} from "./tournament-king";

describe("isKingOfTheCourt", () => {
  it("is a Friendly tournament in the king of the court shape", () => {
    assert.equal(
      isKingOfTheCourt("friendly_tournament", "king_of_the_court"),
      true,
    );
    assert.equal(isKingOfTheCourt("friendly_tournament", "groups_only"), false);
    assert.equal(isKingOfTheCourt("friendly_game", "king_of_the_court"), false);
  });
});

describe("courts and teams", () => {
  it("puts two teams on every court and keeps courts from 2 to 6", () => {
    assert.equal(kingTeamCount(4), 8);
    assert.equal(clampKingCourts(9), 6);
    assert.equal(clampKingCourts(1), 2);
    assert.equal(kingCourtCount(8), 4);
    assert.equal(kingCourtCount(7), 4);
    assert.equal(kingCourtCount(null), 0);
  });
});

describe("the draw", () => {
  it("splits a drawn order two a court from Court 1 down", () => {
    const courts = kingCourtsFromOrder(["a", "b", "c", "d", "e"]);
    assert.deepEqual(courts, [
      { court: 1, teams: ["a", "b"] },
      { court: 2, teams: ["c", "d"] },
      { court: 3, teams: ["e"] },
    ]);
  });

  it("swaps two positions and leaves the rest", () => {
    assert.deepEqual(swapPositions(["a", "b", "c"], 0, 2), ["c", "b", "a"]);
    assert.deepEqual(swapPositions(["a", "b"], 0, 5), ["a", "b"]);
  });

  it("shuffles with the given random source and keeps every team", () => {
    const order = shuffledOrder(["a", "b", "c", "d"], () => 0);
    assert.deepEqual([...order].sort(), ["a", "b", "c", "d"]);
    assert.deepEqual(order, ["b", "c", "d", "a"]);
  });

  it("reads the posted courts back in court order", () => {
    const teams = [
      { id: "c", sideIndex: 3, startCourt: 2 },
      { id: "a", sideIndex: 1, startCourt: 1 },
      { id: "b", sideIndex: 2, startCourt: 1 },
      { id: "d", sideIndex: 4, startCourt: null },
    ];
    assert.deepEqual(
      postedStartingOrder(teams)?.map((team) => team.id),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      startingCourtsOf(teams).map((court) => [
        court.court,
        court.teams.map((team) => team.id),
      ]),
      [
        [1, ["a", "b"]],
        [2, ["c"]],
      ],
    );
    assert.equal(postedStartingOrder([{ id: "a", sideIndex: 1 }]), null);
  });
});

describe("kingCourtMoves", () => {
  it("moves up on a win and down on a loss", () => {
    assert.deepEqual(kingCourtMoves(3, 4), {
      win: 2,
      winStays: false,
      lose: 4,
      loseStays: false,
    });
  });

  it("keeps the king on Court 1 and the bottom court's loser where it is", () => {
    assert.equal(kingCourtMoves(1, 4).winStays, true);
    assert.equal(kingCourtMoves(1, 4).win, 1);
    assert.equal(kingCourtMoves(4, 4).loseStays, true);
    assert.equal(kingCourtMoves(4, 4).lose, 4);
  });

  it("tags the king's court and the bottom court", () => {
    assert.equal(kingCourtTag(1, 4), "kings");
    assert.equal(kingCourtTag(4, 4), "bottom");
    assert.equal(kingCourtTag(2, 4), null);
  });
});

describe("the final order", () => {
  it("unlocks from the top three, or every team in a smaller field", () => {
    assert.equal(canPostFinalOrder(0, 8), false);
    assert.equal(canPostFinalOrder(2, 8), false);
    assert.equal(canPostFinalOrder(3, 8), true);
    assert.equal(canPostFinalOrder(2, 2), true);
  });

  it("stays open to change for 24 hours after it is first posted", () => {
    const posted = new Date("2026-11-08T12:00:00Z");
    assert.equal(finalOrderStillOpen(null, posted), true);
    assert.equal(
      finalOrderStillOpen(posted, new Date("2026-11-09T11:59:00Z")),
      true,
    );
    assert.equal(
      finalOrderStillOpen(posted, new Date("2026-11-09T12:00:00Z")),
      false,
    );
  });

  it("lists the placed teams first and the king at the top", () => {
    const order = kingFinalOrderOf([
      { id: "a", sideIndex: 1, finalPlace: null },
      { id: "b", sideIndex: 2, finalPlace: 2 },
      { id: "c", sideIndex: 3, finalPlace: 1 },
    ]);
    assert.deepEqual(
      order.placed.map((team) => team.id),
      ["c", "b"],
    );
    assert.deepEqual(
      order.unplaced.map((team) => team.id),
      ["a"],
    );
    assert.equal(order.king?.id, "c");
  });
});

describe("names", () => {
  const members = [
    { id: "u1", name: "Hassan Haji" },
    { id: "u2", name: "Khalid Janahi" },
  ];

  it("names the king by first names", () => {
    assert.equal(kingFirstNames(members), "Hassan & Khalid");
  });

  it("puts the viewer first as You", () => {
    assert.equal(kingPairName(members, "u1", "en"), "You & Khalid J");
    assert.equal(kingPairName(members, "x", "en"), "Hassan H & Khalid J");
  });

  it("labels play time in hours and minutes", () => {
    assert.equal(kingPlayMinutesLabel(90, "en"), "1 h 30");
    assert.equal(kingPlayMinutesLabel(120, "en"), "2 h");
  });
});

describe("play time", () => {
  it("turns a start slot and a play time into a finish slot", () => {
    assert.equal(kingFinishSlot("09:00", 120), "11:00");
    assert.equal(kingFinishSlot("09:30", 90), "11:00");
    assert.equal(kingFinishSlot("bad", 90), null);
    assert.equal(kingSlotPlayMinutes("09:00", "11:00"), 120);
    assert.equal(kingSlotPlayMinutes("11:00", "09:00"), null);
  });
});
