import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  firstName,
  gameCardFormatCell,
  gameCardOpenSpots,
  gameCardSubtitle,
  hubRegisterToast,
  hubWaitlistJoinCall,
  sideJoinAccessibleName,
  vacantSeats,
} from "./game-card";

const someone = { name: "Ada" };

describe("vacantSeats", () => {
  it("lists every empty seat, left before right, in side order", () => {
    assert.deepEqual(
      vacantSeats([
        { sideIndex: 1, left: someone, right: null },
        { sideIndex: 2, left: null, right: null },
      ]),
      [
        { sideIndex: 1, position: "right" },
        { sideIndex: 2, position: "left" },
        { sideIndex: 2, position: "right" },
      ],
    );
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    assert.equal(firstName("  Ada Lovelace "), "Ada");
  });
});

describe("gameCardSubtitle", () => {
  it("joins the Game name, court and a city that differs from the venue", () => {
    assert.equal(
      gameCardSubtitle("Padelhuset", "Bromma", "Tuesday", "Court 2"),
      "Tuesday — Court 2 — Bromma",
    );
  });

  it("drops a city equal to the venue name", () => {
    assert.equal(gameCardSubtitle("Bromma", "Bromma", null), null);
  });
});

describe("sideJoinAccessibleName", () => {
  it("names the team and position", () => {
    assert.equal(sideJoinAccessibleName(1, "left", null), "Join Team A Left");
  });

  it("adds the partner already on the side", () => {
    assert.equal(
      sideJoinAccessibleName(2, "right", "Ada"),
      "Join Team B Right with Ada",
    );
  });
});

describe("gameCardOpenSpots", () => {
  it("counts vacant roster seats when a roster is shown", () => {
    assert.deepEqual(
      gameCardOpenSpots({
        sides: [{ sideIndex: 1, left: someone, right: null }],
        registeredUserCount: 1,
        playersAllowed: 4,
      }),
      { showRoster: true, hasOpenCount: true, openSpots: 1 },
    );
  });

  it("falls back to the occupancy seats left", () => {
    assert.deepEqual(
      gameCardOpenSpots({ registeredUserCount: 3, playersAllowed: 8 }),
      { showRoster: false, hasOpenCount: true, openSpots: 5 },
    );
  });

  it("has no count without a roster or a player limit", () => {
    assert.equal(gameCardOpenSpots({}).hasOpenCount, false);
  });
});

describe("gameCardFormatCell", () => {
  it("leads with the format and notes the duration", () => {
    assert.deepEqual(
      gameCardFormatCell({
        formatMeta: "Friendly game",
        durationMeta: "2 h",
        levelMeta: "3.0–4.0",
      }),
      { value: "Friendly game", note: "2 h" },
    );
  });

  it("falls back to duration then Level", () => {
    assert.deepEqual(
      gameCardFormatCell({
        formatMeta: null,
        durationMeta: "2 h",
        levelMeta: "3.0–4.0",
      }),
      { value: "2 h", note: "3.0–4.0" },
    );
  });

  it("is null with nothing to show", () => {
    assert.equal(
      gameCardFormatCell({
        formatMeta: null,
        durationMeta: null,
        levelMeta: null,
      }),
      null,
    );
  });
});

describe("hubWaitlistJoinCall", () => {
  it("registers Americano and seats everything else", () => {
    assert.equal(hubWaitlistJoinCall("americano"), "register");
    assert.equal(hubWaitlistJoinCall("friendly_game"), "registerSeat");
    assert.equal(hubWaitlistJoinCall("friendly_tournament"), "registerSeat");
  });
});

describe("hubRegisterToast", () => {
  it("tells a waitlist from a seat", () => {
    assert.equal(hubRegisterToast(true), "Joined waitlist");
    assert.equal(hubRegisterToast(false), "Registered");
  });
});
