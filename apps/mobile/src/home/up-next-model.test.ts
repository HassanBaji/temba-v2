import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  upNextDayLabel,
  upNextItems,
  upNextRowView,
  upNextWeekLabel,
  type UpNextBooking,
  type UpNextGame,
} from "./up-next-model";

const NOW = new Date("2026-10-26T09:00:00.000Z");

function game(overrides: Partial<UpNextGame> = {}): UpNextGame {
  return {
    id: "game-1",
    name: "Tuesday Night Padel",
    format: "friendly_game",
    registrationMode: "individual",
    sport: "padel",
    rated: true,
    groupName: "Tuesday Night Padel",
    startTime: new Date("2026-10-29T16:00:00.000Z"),
    venue: { id: "venue-1", name: "Seef Padel Club", city: "Manama" },
    courtName: "Court 2",
    registeredUserCount: 3,
    playersAllowed: 4,
    sides: [
      {
        left: { name: "A", isViewer: true },
        right: { name: "B", isViewer: false },
      },
      { left: { name: "C", isViewer: false }, right: null },
    ],
    matchId: null,
    poolCount: null,
    roundNumber: null,
    roundCount: null,
    tournament: null,
    knockoutMatch: null,
    football: null,
    phase: "upcoming",
    canAddResults: false,
    ...overrides,
  } as UpNextGame;
}

function booking(overrides: Partial<UpNextBooking> = {}): UpNextBooking {
  return {
    id: "booking-1",
    startsAt: new Date("2026-10-26T10:00:00.000Z"),
    endsAt: new Date("2026-10-26T11:00:00.000Z"),
    status: "confirmed",
    statusLabel: "Confirmed",
    paymentStatus: "paid",
    priceFils: 20_000,
    gameId: null,
    venue: {
      id: "venue-2",
      name: "test court",
      city: "Manama",
      latitude: null,
      longitude: null,
    },
    court: { id: "court-1", name: "football court 1", sport: "football" },
    ...overrides,
  } as UpNextBooking;
}

describe("upNextItems", () => {
  it("mixes Bookings and Games across both sports, soonest first", () => {
    const football = game({
      id: "game-2",
      name: "First football",
      sport: "football",
      startTime: new Date("2026-10-31T05:30:00.000Z"),
    });
    const items = upNextItems([football, game()], [booking()]);
    assert.deepEqual(
      items.map((item) => [item.kind, item.sport]),
      [
        ["booking", "football"],
        ["game", "padel"],
        ["game", "football"],
      ],
    );
  });

  it("lists a Booking that already has its Game once, as the Game", () => {
    const items = upNextItems(
      [game({ id: "booked-game" })],
      [booking({ gameId: "booked-game" }), booking({ id: "booking-2" })],
    );
    assert.deepEqual(
      items.map((item) => item.key),
      ["booking:booking-2", "game:booked-game"],
    );
  });
});

describe("upNextWeekLabel", () => {
  it("counts what starts in the coming seven days", () => {
    const later = game({ id: "later", startTime: new Date("2026-11-09") });
    const items = upNextItems([game(), later], [booking()]);
    assert.equal(upNextWeekLabel(items, NOW), "2 this week");
    assert.equal(upNextWeekLabel([], NOW), "Nothing this week");
  });
});

describe("upNextDayLabel", () => {
  it("says Today, then the weekday, then the date past a week", () => {
    assert.equal(
      upNextDayLabel(new Date("2026-10-26T15:00:00Z"), NOW),
      "Today",
    );
    assert.equal(upNextDayLabel(new Date("2026-10-29T15:00:00Z"), NOW), "Thu");
    assert.equal(
      upNextDayLabel(new Date("2026-11-05T15:00:00Z"), NOW),
      "5 Nov",
    );
  });
});

describe("upNextRowView", () => {
  it("names a padel Game by its name, with the Venue and Court and seat bars", () => {
    const [item] = upNextItems([game()], []);
    const row = upNextRowView(item!, NOW);
    assert.equal(row.day, "Thu");
    assert.equal(row.title, "Tuesday Night Padel");
    assert.equal(row.detail, "Seef Padel Club, Court 2");
    assert.deepEqual(row.trailing, {
      kind: "bars",
      bars: ["taken", "taken", "taken", "open"],
    });
  });

  it("counts a football roster instead of drawing seats", () => {
    const [item] = upNextItems(
      [
        game({
          name: "First football",
          sport: "football",
          registrationMode: "roster",
          courtName: null,
          registeredUserCount: 11,
          playersAllowed: 14,
          football: { sideSize: 7 } as UpNextGame["football"],
        }),
      ],
      [],
    );
    const row = upNextRowView(item!, NOW);
    assert.equal(row.detail, "Seef Padel Club, 7-a-side");
    assert.deepEqual(row.trailing, { kind: "text", label: "11 of 14" });
  });

  it("shows a Booking by its Venue, Court, length and payment", () => {
    const [item] = upNextItems([], [booking()]);
    const row = upNextRowView(item!, NOW);
    assert.equal(row.title, "test court");
    assert.equal(row.detail, "football court 1, 60 min");
    assert.deepEqual(row.trailing, { kind: "text", label: "Paid" });
  });
});
