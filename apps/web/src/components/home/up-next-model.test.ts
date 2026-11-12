import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  upNextDayLabel,
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
    hasCustomName: true,
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
    assert.equal(upNextWeekLabel(items, NOW, "en"), "1 of 1 this week");
    assert.equal(upNextWeekLabel([], NOW, "en"), "nothing this week");
  });
});

describe("day labels", () => {
  it("says Today, then the weekday, then the date past a week", () => {
    assert.equal(
      upNextDayLabel(new Date("2026-10-26T15:00:00Z"), NOW, "en"),
      "Today",
    );
    assert.equal(
      upNextDayLabel(new Date("2026-10-29T15:00:00Z"), NOW, "en"),
      "Thu",
    );
    assert.equal(
      upNextDayLabel(new Date("2026-11-05T15:00:00Z"), NOW, "en"),
      "5 Nov",
    );
  });
});

describe("upNextRowView", () => {
  it("names a padel Game by its name, with the Venue and Court and seat bars", () => {
    const [item] = upNextItems([game()]);
    const row = upNextRowView(item!, NOW, "en");
    assert.equal(row.day, "Thu");
    assert.equal(row.title, "Tuesday Night Padel");
    assert.equal(row.detail, "Seef Padel Club, Court 2");
    assert.deepEqual(row.trailing, {
      kind: "bars",
      bars: ["taken", "taken", "taken", "open"],
    });
  });

  it("counts a football roster's open spots instead of drawing seats", () => {
    const [item] = upNextItems([
      game({
        name: "Thu 8:00 PM - 9:30 PM",
        hasCustomName: false,
        sport: "football",
        registrationMode: "roster",
        courtName: null,
        registeredUserCount: 11,
        playersAllowed: 14,
        football: { sideSize: 7 } as UpNextGame["football"],
      }),
    ]);
    const row = upNextRowView(item!, NOW, "en");
    assert.equal(row.title, "Seef Padel Club");
    assert.equal(row.detail, "Football, 7-a-side");
    assert.deepEqual(row.trailing, { kind: "text", label: "3 spots open" });
    assert.equal(upNextRowView(item!, NOW, "ar").detail, "كرة القدم، 7 ضد 7");
  });
});
