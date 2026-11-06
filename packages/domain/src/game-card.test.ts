import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  firstName,
  gameCardFormatCell,
  gameCardOpenSpots,
  gameCardRosterOccupancy,
  gameCardSportTag,
  hubGameCardPlan,
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
  it("joins the custom name, court and a city that differs from the venue", () => {
    assert.equal(
      gameCardSubtitle(
        {
          venueName: "Padelhuset",
          location: "Bromma",
          customName: "Tuesday club",
          courtName: "Court 2",
        },
        "en",
      ),
      "Tuesday club, Court 2, Bromma",
    );
  });

  it("drops a city equal to the venue name", () => {
    assert.equal(
      gameCardSubtitle(
        { venueName: "Bromma", location: "Bromma", customName: null },
        "en",
      ),
      null,
    );
  });

  it("says when the Game ends instead of repeating the window", () => {
    assert.equal(
      gameCardSubtitle(
        {
          venueName: "A'ali Club",
          location: "عالي",
          customName: null,
          windowEnd: new Date("2026-11-04T09:00:00Z"),
        },
        "ar",
      ),
      "حتى 12:00 م، عالي",
    );
  });
});

describe("sideJoinAccessibleName", () => {
  it("names the team and position", () => {
    assert.equal(
      sideJoinAccessibleName(1, "left", null, "en"),
      "Join Team A Left",
    );
  });

  it("adds the partner already on the side", () => {
    assert.equal(
      sideJoinAccessibleName(2, "right", "Ada", "en"),
      "Join Team B Right with Ada",
    );
  });

  it("names the seat in Arabic", () => {
    assert.match(
      sideJoinAccessibleName(1, "left", "Ada", "ar"),
      /^انضم إلى .* يسار مع Ada$/,
    );
    assert.equal(hubRegisterToast(false, "ar"), "تم التسجيل");
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

  it("registers a football Friendly game and seats a padel one", () => {
    assert.equal(hubWaitlistJoinCall("friendly_game", "football"), "register");
    assert.equal(hubWaitlistJoinCall("friendly_game", "padel"), "registerSeat");
  });
});

describe("hubRegisterToast", () => {
  it("tells a waitlist from a seat", () => {
    assert.equal(hubRegisterToast(true, "en"), "Joined waitlist");
    assert.equal(hubRegisterToast(false, "en"), "Registered");
  });
});

describe("gameCardSportTag", () => {
  it("pairs the glyph with the word", () => {
    assert.deepEqual(gameCardSportTag("football", "en"), {
      glyph: "goal",
      label: "Football",
    });
    assert.deepEqual(gameCardSportTag("padel", "en"), {
      glyph: "circle-dot",
      label: "Padel",
    });
  });

  it("is null when the sport is unknown", () => {
    assert.equal(gameCardSportTag(null, "en"), null);
    assert.equal(gameCardSportTag("", "en"), null);
  });
});

describe("gameCardRosterOccupancy", () => {
  const base = { format: "friendly_game", registeredUserCount: 7 };

  it("reads 7/10 on a football Game", () => {
    const occupancy = gameCardRosterOccupancy({
      ...base,
      sport: "football",
      playersAllowed: 10,
    });
    assert.equal(occupancy?.label, "7/10");
    assert.equal(occupancy?.seatsLeft, 3);
  });

  it("is null on a seat Game", () => {
    assert.equal(
      gameCardRosterOccupancy({ ...base, sport: "padel", playersAllowed: 4 }),
      null,
    );
  });
});

describe("hubGameCardPlan", () => {
  const row = {
    format: "friendly_game",
    registrationMode: "individual",
    canRegister: true,
    canWaitlist: false,
    isRegistered: false,
    isSeated: false,
    isWaitlisted: false,
    registrationStatus: "open",
    sides: [],
    matchId: null,
  };

  it("registers a football Game and shows no seat roster", () => {
    const plan = hubGameCardPlan({ ...row, sport: "football" });
    assert.equal(plan.primaryAction, "register");
    assert.equal(plan.rosterSides, undefined);
    assert.equal(plan.showPartnerJoin, false);
  });

  it("keeps the seat roster on a padel Game", () => {
    const plan = hubGameCardPlan({ ...row, sport: "padel" });
    assert.equal(plan.primaryAction, "join");
    assert.deepEqual(plan.rosterSides, []);
  });
});
