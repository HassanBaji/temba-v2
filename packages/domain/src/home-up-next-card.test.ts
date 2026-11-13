import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  gameCardView,
  type HomeCardGame,
  type HomeCardItem,
} from "./home-up-next-card";

const NOW = new Date("2026-11-11T09:00:00.000Z");

function occupant(userId: string, name: string, isViewer = false) {
  return { userId, name, image: null, isViewer };
}

function game(overrides: Partial<HomeCardGame> = {}): HomeCardGame {
  return {
    id: "game-1",
    name: "Tuesday Night Padel",
    hasCustomName: true,
    format: "friendly_game",
    registrationMode: "individual",
    sport: "padel",
    rated: true,
    ratingScope: "temba",
    groupName: "Tuesday Night Padel",
    startTime: new Date("2026-11-12T16:00:00.000Z"),
    windowStart: new Date("2026-11-12T16:00:00.000Z"),
    windowEnd: new Date("2026-11-12T17:30:00.000Z"),
    venue: { id: "venue-1", name: "Ace Padel", city: "Manama" },
    courtName: "Court 2",
    levelMinTenths: null,
    levelMaxTenths: null,
    registeredUserCount: 3,
    playersAllowed: 4,
    sides: [
      {
        sideIndex: 0,
        left: occupant("kj", "Khalid J"),
        right: occupant("me", "Hassan Haji", true),
      },
      { sideIndex: 1, left: null, right: occupant("ab", "Ahmed B") },
    ],
    tournament: null,
    football: null,
    phase: "upcoming",
    canAddResults: false,
    viewerIsOrganizer: false,
    ...overrides,
  } as HomeCardGame;
}

function item(value: HomeCardGame): HomeCardItem {
  return {
    key: `game:${value.id}`,
    startsAt: new Date(value.startTime),
    sport: value.sport === "football" ? "football" : "padel",
    game: value,
  };
}

describe("gameCardView", () => {
  it("says when and where once, with the countdown top right", () => {
    const view = gameCardView(item(game()), NOW, "en");
    assert.equal(view.sportName, "Padel");
    assert.equal(view.title, "Tuesday Night Padel");
    assert.equal(view.countdown, "in 1 day");
    assert.equal(view.dateLine, "Thursday 12 November");
    assert.deepEqual(view.kickoff, { time: "7:00", meridiem: "PM" });
    assert.equal(view.until, "to 8:30");
    assert.equal(view.place, "Ace Padel, Court 2");
  });

  it("says Today on the Game's own day", () => {
    const onTheDay = new Date("2026-11-12T09:00:00.000Z");
    const view = gameCardView(item(game()), onTheDay, "en");
    assert.equal(view.dateLine, "Today");
  });

  it("shows padel as two sides and names the teammate of the open seat", () => {
    const view = gameCardView(item(game()), NOW, "en");
    assert.equal(view.who?.kind, "sides");
    if (view.who?.kind !== "sides") return;
    assert.equal(view.who.header, "3 of 4 in");
    assert.equal(view.who.scope, "Rated");
    assert.deepEqual(
      view.who.sides.map((side) =>
        side.map((seat) => (seat.filled ? seat.name : "open")),
      ),
      [
        ["Hassan Haji", "Khalid J"],
        ["Ahmed B", "open"],
      ],
    );
    assert.equal(view.step.title, "One seat left, on Ahmed's side");
    assert.equal(view.secondary?.label, "Details");
    assert.equal(view.primary.label, "Invite a player");
    assert.deepEqual(view.primary.target, {
      kind: "game",
      gameId: "game-1",
      intent: "invite",
    });
  });

  it("asks a full padel game to arrive early and offers directions", () => {
    const full = game({
      registeredUserCount: 4,
      sides: [
        {
          sideIndex: 0,
          left: occupant("kj", "Khalid J"),
          right: occupant("me", "Hassan Haji", true),
        },
        {
          sideIndex: 1,
          left: occupant("da", "Dana A"),
          right: occupant("ab", "Ahmed B"),
        },
      ],
    });
    const view = gameCardView(item(full), NOW, "en");
    assert.equal(view.who?.header, "All four in");
    assert.equal(view.step.title, "Be there by 6:45 PM");
    assert.deepEqual(view.primary.target, { kind: "directions" });
  });

  it("shows the football pool as a bar with who is in by position", () => {
    const pool = game({
      sport: "football",
      name: null,
      hasCustomName: false,
      groupName: "Karbabad Friday Football",
      registeredUserCount: 11,
      playersAllowed: 14,
      sides: [],
      football: {
        sideSize: 7,
        sides: null,
        positions: { keepers: 1, def: 4, mid: 4, fwd: 2 },
        viewer: { sideIndex: null, role: "outfield", position: "def" },
        score: null,
        matchId: null,
        matchStatus: null,
        needsViewerConfirmation: false,
        enteredByName: null,
      },
    });
    const view = gameCardView(item(pool), NOW, "en");
    assert.equal(view.title, "Karbabad Friday Football");
    assert.equal(view.who?.kind, "pool");
    if (view.who?.kind !== "pool") return;
    assert.equal(view.who.header, "11 of 14 in");
    assert.equal(view.who.bar.filter((seat) => seat === "taken").length, 11);
    assert.deepEqual(
      view.who.positions.map((count) => `${count.value} ${count.label}`),
      ["1 of 2 keeper", "4 defenders", "4 mid", "2 forwards"],
    );
    assert.equal(view.step.title, "You're in. 3 more and it's on");
  });

  it("asks the organizer of a full pool to make the teams", () => {
    const full = game({
      sport: "football",
      registeredUserCount: 14,
      playersAllowed: 14,
      sides: [],
      viewerIsOrganizer: true,
      football: {
        sideSize: 7,
        sides: null,
        viewer: { sideIndex: null, role: null, position: null },
        score: null,
        matchId: null,
        matchStatus: null,
        needsViewerConfirmation: false,
        enteredByName: null,
      },
    });
    const view = gameCardView(item(full), NOW, "en");
    assert.equal(view.who?.header, "All 14 in");
    assert.equal(view.step.title, "Full. Time to make the teams");
    assert.equal(view.primary.label, "Make teams");
  });

  it("splits made teams by bib and says where the viewer plays", () => {
    const teams = game({
      sport: "football",
      sides: [],
      football: {
        sideSize: 7,
        sides: [
          {
            sideIndex: 1,
            bib: "black",
            members: [
              occupant("me", "Hassan Haji", true),
              occupant("yk", "Yusif K"),
            ],
          },
          { sideIndex: 2, bib: "white", members: [occupant("om", "Omar M")] },
        ],
        viewer: { sideIndex: 1, role: "outfield", position: "def" },
        score: null,
        matchId: "m1",
        matchStatus: null,
        needsViewerConfirmation: false,
        enteredByName: null,
      },
    });
    const view = gameCardView(item(teams), NOW, "en");
    assert.equal(view.who?.kind, "teams");
    if (view.who?.kind !== "teams") return;
    assert.equal(view.who.header, "Teams are made");
    assert.deepEqual(
      view.who.teams.map((team) => team.label),
      ["Black", "White"],
    );
    assert.equal(view.step.title, "You're in Black, at the back");
    assert.equal(
      view.step.body,
      "Wear a dark shirt. The lineups are on the game.",
    );
    assert.equal(view.secondary?.label, "Directions");
    assert.equal(view.primary.label, "See the lineups");
  });

  it("asks for the score once a game has ended", () => {
    const ended = game({
      phase: "needs_results",
      startTime: new Date("2026-11-11T07:00:00.000Z"),
      windowEnd: new Date("2026-11-11T08:30:00.000Z"),
    });
    const view = gameCardView(item(ended), NOW, "en");
    assert.equal(view.countdown, "Ended");
    assert.equal(view.step.title, "How did it go?");
    assert.deepEqual(view.primary.target, {
      kind: "game",
      gameId: "game-1",
      intent: "results",
    });
  });

  it("puts Unrated and the level range in the players header", () => {
    const unrated = game({
      rated: false,
      ratingScope: "unrated",
      levelMinTenths: 25,
      levelMaxTenths: 35,
    });
    const view = gameCardView(item(unrated), NOW, "en");
    assert.match(view.who?.scope ?? "", /^Unrated, /);
  });

  it("reads its copy from the Arabic catalog", () => {
    const view = gameCardView(item(game()), NOW, "ar");
    assert.equal(view.who?.header, "3 من 4 حاضرون");
    assert.equal(view.step.title, "بقي مقعد واحد، في جهة Ahmed");
  });
});
