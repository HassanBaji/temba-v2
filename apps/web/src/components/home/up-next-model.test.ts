import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  startsInLabel,
  upNextDayLabel,
  upNextHeroDay,
  upNextItems,
  upNextRowView,
  upNextWeekLabel,
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

describe("upNextItems", () => {
  it("lists Games across both sports, soonest first", () => {
    const football = game({
      id: "game-2",
      name: "First football",
      sport: "football",
      startTime: new Date("2026-10-27T05:30:00.000Z"),
    });
    const items = upNextItems([game(), football]);
    assert.deepEqual(
      items.map((item) => [item.key, item.sport]),
      [
        ["game:game-2", "football"],
        ["game:game-1", "padel"],
      ],
    );
  });
});

describe("upNextWeekLabel", () => {
  it("counts what starts in the coming seven days", () => {
    const later = game({ id: "later", startTime: new Date("2026-11-09") });
    const items = upNextItems([game(), later]);
    assert.equal(upNextWeekLabel(items, NOW), "1 this week");
    assert.equal(upNextWeekLabel([], NOW), "Nothing this week");
  });
});

describe("day labels", () => {
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

  it("says Tonight for an evening start today, then Tomorrow", () => {
    assert.equal(upNextHeroDay(new Date("2026-10-26T10:00:00Z"), NOW), "Today");
    assert.equal(
      upNextHeroDay(new Date("2026-10-26T16:00:00Z"), NOW),
      "Tonight",
    );
    assert.equal(
      upNextHeroDay(new Date("2026-10-27T10:00:00Z"), NOW),
      "Tomorrow",
    );
  });

  it("counts down inside the coming day", () => {
    const end = new Date("2026-10-26T12:00:00Z");
    assert.equal(
      startsInLabel(new Date("2026-10-26T09:40:00Z"), end, NOW),
      "in 40 min",
    );
    assert.equal(
      startsInLabel(new Date("2026-10-26T11:15:00Z"), end, NOW),
      "in 2 h 15 min",
    );
    assert.equal(
      startsInLabel(new Date("2026-10-26T08:00:00Z"), end, NOW),
      "on now",
    );
    assert.equal(
      startsInLabel(
        new Date("2026-10-28T09:00:00Z"),
        new Date("2026-10-28T10:00:00Z"),
        NOW,
      ),
      null,
    );
  });
});

describe("upNextRowView", () => {
  it("names a padel Game by its name, with the Venue and Court and seat bars", () => {
    const [item] = upNextItems([game()]);
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
    const [item] = upNextItems([
      game({
        name: "First football",
        sport: "football",
        registrationMode: "roster",
        courtName: null,
        registeredUserCount: 11,
        playersAllowed: 14,
        football: { sideSize: 7 } as UpNextGame["football"],
      }),
    ]);
    const row = upNextRowView(item!, NOW);
    assert.equal(row.detail, "Seef Padel Club, 7-a-side");
    assert.deepEqual(row.trailing, { kind: "text", label: "11 of 14" });
  });
});
