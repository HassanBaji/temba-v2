import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  homeGameKind,
  homeGameRowLines,
  homeHeroTitle,
  homeHeroUntil,
  homeOpenSpotsLabel,
} from "./home-game-lines";

const WEDNESDAY_10_30 = new Date("2026-11-04T07:30:00Z");
const WEDNESDAY_12_00 = new Date("2026-11-04T09:00:00Z");

const padel = {
  name: "Wed 10:30 AM - 12:00 PM",
  hasCustomName: false,
  format: "friendly_game",
  startTime: WEDNESDAY_10_30,
  groupName: "Padel games",
  venue: { name: "A'ali Club" },
  courtName: null,
  football: null,
};

const football = {
  ...padel,
  name: "Thu 2:30 AM - 4:00 AM",
  format: "football",
  courtName: null,
  football: { sideSize: 5 },
};

describe("homeGameKind", () => {
  it("names a friendly Game and falls back to Game", () => {
    assert.equal(homeGameKind("friendly_game", "ar"), "ودية");
    assert.equal(homeGameKind("friendly_game", "en"), "Friendly");
    assert.equal(homeGameKind("americano", "en"), "Game");
  });
});

describe("homeHeroTitle", () => {
  it("shows the date instead of the stored window label", () => {
    assert.equal(homeHeroTitle(padel, "ar"), "الأربعاء 4 نوفمبر");
    assert.equal(homeHeroTitle(padel, "en"), "Wednesday 4 November");
  });

  it("keeps a name the Organizer chose", () => {
    assert.equal(
      homeHeroTitle(
        { ...padel, name: "Ladies night", hasCustomName: true },
        "ar",
      ),
      "Ladies night",
    );
  });
});

describe("homeHeroUntil", () => {
  it("joins the finish and the length with the locale's comma", () => {
    assert.equal(
      homeHeroUntil(WEDNESDAY_10_30, WEDNESDAY_12_00, "ar"),
      "حتى 12:00 م، 90 دقيقة",
    );
    assert.equal(
      homeHeroUntil(WEDNESDAY_10_30, WEDNESDAY_12_00, "en"),
      "until 12:00 PM, 90 min",
    );
  });
});

describe("homeGameRowLines", () => {
  it("puts the venue on top and sport and team size underneath", () => {
    assert.deepEqual(homeGameRowLines(football, "ar"), {
      title: "A'ali Club",
      detail: "كرة القدم، 5 ضد 5",
    });
  });

  it("never repeats the window label", () => {
    assert.deepEqual(homeGameRowLines(padel, "en"), {
      title: "A'ali Club",
      detail: null,
    });
  });

  it("leads with a custom name and moves the venue down", () => {
    assert.deepEqual(
      homeGameRowLines(
        {
          ...padel,
          name: "Ladies night",
          hasCustomName: true,
          courtName: "Court 2",
        },
        "en",
      ),
      { title: "Ladies night", detail: "A'ali Club, Court 2" },
    );
  });
});

describe("homeOpenSpotsLabel", () => {
  it("counts the open spots in Arabic", () => {
    assert.equal(homeOpenSpotsLabel(0, 10, "ar"), "10 أماكن شاغرة");
    assert.equal(homeOpenSpotsLabel(10, 10, "ar"), "ممتلئ");
    assert.equal(homeOpenSpotsLabel(9, 10, "en"), "One spot open");
  });
});
