import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  footballGameCta,
  footballGameDetailsModel,
  footballOccupancyLine,
  isFootballRosterGame,
  type FootballGameDetailsInput,
} from "./football-game-details";

const NOW = new Date("2026-10-26T10:00:00.000Z");

function person(id: string) {
  return { id, name: `Player ${id}`, image: null };
}

function game(
  overrides: Partial<FootballGameDetailsInput> = {},
): FootballGameDetailsInput {
  return {
    name: null,
    sideSize: 5,
    playersAllowed: 10,
    venue: { name: "Riffa Sports", city: "Riffa" },
    recordedCourts: [{ name: "Pitch 2" }],
    windowStart: new Date("2026-10-26T16:00:00.000Z"),
    windowEnd: new Date("2026-10-26T17:30:00.000Z"),
    pricePerPlayerFils: 2500,
    cancelledAt: null,
    registrationClosedAt: null,
    registrationStatus: "open",
    rated: false,
    joinFrozen: false,
    isOrganizer: false,
    viewerUserId: "me",
    isRegistered: false,
    isWaitlisted: false,
    waitlistPlace: null,
    canRegister: true,
    canWaitlist: false,
    roster: {
      users: [person("a"), person("me"), person("c")],
      count: 3,
      cap: 10,
    },
    waitlist: [],
    ...overrides,
  };
}

describe("footballOccupancyLine", () => {
  it("reads 5-a-side · 7/10", () => {
    assert.equal(footballOccupancyLine(5, 7, 10, "en"), "5-a-side · 7/10");
  });

  it("drops the missing parts", () => {
    assert.equal(footballOccupancyLine(null, 7, 10, "en"), "7/10");
    assert.equal(footballOccupancyLine(7, 4, null, "en"), "7-a-side · 4");
  });
});

describe("footballGameDetailsModel", () => {
  it("heads with size and occupancy, the Venue and pitch, price and duration", () => {
    const { hero, title } = footballGameDetailsModel(game(), NOW, "en");
    assert.equal(title, "Riffa Sports");
    assert.equal(hero.sizeLine, "5-a-side · 3/10");
    assert.equal(hero.placeLine, "Riffa Sports · Pitch 2 · Riffa");
    assert.equal(hero.tone, "ink");
    assert.deepEqual(
      hero.figures.map((figure) => [figure.key, figure.value]),
      [
        ["price", "2.500 BD"],
        ["duration", "90m"],
      ],
    );
  });

  it("lists the roster in registration order and marks the viewer", () => {
    const { rosterRows, openSpots } = footballGameDetailsModel(
      game(),
      NOW,
      "en",
    );
    assert.deepEqual(
      rosterRows.map((row) => [row.place, row.id, row.isViewer]),
      [
        [1, "a", false],
        [2, "me", true],
        [3, "c", false],
      ],
    );
    assert.equal(openSpots, 7);
  });

  it("is always Unrated", () => {
    assert.equal(
      footballGameDetailsModel(game(), NOW, "en").unratedLine,
      "Unrated",
    );
  });

  it("turns paper once cancelled or over", () => {
    assert.equal(
      footballGameDetailsModel(game({ cancelledAt: NOW }), NOW, "en").hero.tone,
      "paper",
    );
    const later = new Date("2026-10-27T10:00:00.000Z");
    const over = footballGameDetailsModel(game(), later, "en").hero;
    assert.equal(over.tone, "paper");
    assert.equal(over.statusLabel, "Played");
  });

  it("offers the Organizer kick on everyone but themselves, and cap bounds from the side size", () => {
    const model = footballGameDetailsModel(
      game({
        isOrganizer: true,
        roster: {
          users: Array.from({ length: 12 }, (_, i) => person(String(i))),
          count: 12,
          cap: 14,
        },
      }),
      NOW,
      "en",
    );
    assert.ok(model.organizer);
    assert.deepEqual(model.organizer.capBounds, { min: 10, max: 40 });
    assert.equal(model.organizer.registration, "close");
    assert.equal(
      model.rosterRows.every((row) => row.kickable),
      true,
    );
  });

  it("never lets the cap bound fall below twice the side size", () => {
    const model = footballGameDetailsModel(
      game({ isOrganizer: true, sideSize: 7, playersAllowed: 14 }),
      NOW,
      "en",
    );
    assert.deepEqual(model.organizer?.capBounds, { min: 14, max: 40 });
  });

  it("hides the Organizer card and kicks from a non-Organizer and once cancelled", () => {
    assert.equal(footballGameDetailsModel(game(), NOW, "en").organizer, null);
    const cancelled = footballGameDetailsModel(
      game({ isOrganizer: true, cancelledAt: NOW }),
      NOW,
      "en",
    );
    assert.equal(cancelled.organizer, null);
    assert.equal(
      cancelled.rosterRows.some((row) => row.kickable),
      false,
    );
  });

  it("offers reopen once registration is closed", () => {
    const model = footballGameDetailsModel(
      game({ isOrganizer: true, registrationClosedAt: NOW }),
      NOW,
      "en",
    );
    assert.equal(model.organizer?.registration, "reopen");
  });
});

describe("footballGameCta", () => {
  it("offers Join on an open Game", () => {
    assert.equal(footballGameCta(game(), "en")?.kind, "join");
  });

  it("offers the waitlist on a full Game", () => {
    assert.equal(
      footballGameCta(game({ canRegister: false, canWaitlist: true }), "en")
        ?.kind,
      "join_waitlist",
    );
  });

  it("shows the waitlist place and offers to leave it", () => {
    const cta = footballGameCta(
      game({ canRegister: false, isWaitlisted: true, waitlistPlace: 2 }),
      "en",
    );
    assert.deepEqual(cta, {
      kind: "waitlisted",
      title: "You're 2nd on the Waitlist",
      actionLabel: "Leave waitlist",
    });
  });

  it("offers Leave to a registered player", () => {
    const cta = footballGameCta(
      game({ canRegister: false, isRegistered: true }),
      "en",
    );
    assert.equal(cta?.kind, "registered");
    assert.equal(cta?.actionLabel, "Leave Game");
  });

  it("offers nothing once cancelled or frozen", () => {
    assert.equal(footballGameCta(game({ cancelledAt: NOW }), "en"), null);
    assert.equal(footballGameCta(game({ joinFrozen: true }), "en"), null);
    assert.equal(footballGameCta(game({ canRegister: false }), "en"), null);
  });
});

describe("Arabic copy", () => {
  it("reads the hero figures and the join CTA in Arabic", () => {
    const model = footballGameDetailsModel(game(), NOW, "ar");
    assert.deepEqual(
      model.hero.figures.map((figure) => figure.label),
      ["السعر", "المدة"],
    );
    assert.equal(model.hero.figures[1]?.value, "90 د");
    assert.equal(footballGameCta(game(), "ar")?.title, "انضم إلى هذه اللعبة");
    assert.equal(
      footballGameCta(game({ canRegister: false, canWaitlist: true }), "ar")
        ?.actionLabel,
      "انضم إلى قائمة الانتظار",
    );
  });
});

describe("isFootballRosterGame", () => {
  it("needs a football sport and a roster", () => {
    const roster = { users: [], count: 0, cap: 10 };
    assert.equal(isFootballRosterGame({ sport: "football", roster }), true);
    assert.equal(isFootballRosterGame({ sport: "padel", roster }), false);
    assert.equal(
      isFootballRosterGame({ sport: "football", roster: null }),
      false,
    );
  });
});
