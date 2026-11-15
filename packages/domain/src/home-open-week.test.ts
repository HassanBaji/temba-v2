import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { openWeekRows } from "./home-open-week";
import type { HubGameRow } from "./hub-game-row";

const NOW = new Date("2026-11-11T09:00:00.000Z");

function game(overrides: Partial<HubGameRow>): HubGameRow {
  return {
    id: "g",
    name: "Tuesday Night Padel",
    hasCustomName: true,
    format: "friendly_game",
    sport: "padel",
    groupName: "Tuesday Night Padel",
    startTime: new Date("2026-11-12T16:00:00.000Z"),
    venue: { id: "v", name: "Ace Padel", city: "Manama" },
    courtName: null,
    registeredUserCount: 2,
    playersAllowed: 4,
    canRegister: true,
    isRegistered: false,
    ...overrides,
  } as HubGameRow;
}

describe("openWeekRows", () => {
  it("lists the two soonest games this week that still take a seat", () => {
    const rows = openWeekRows(
      [
        game({ id: "late", startTime: new Date("2026-11-14T16:00:00.000Z") }),
        game({ id: "soon" }),
        game({ id: "mine", isRegistered: true }),
        game({ id: "closed", canRegister: false }),
        game({
          id: "next-week",
          startTime: new Date("2026-11-20T16:00:00.000Z"),
        }),
        game({ id: "third", startTime: new Date("2026-11-15T16:00:00.000Z") }),
      ],
      NOW,
      "en",
    );
    assert.deepEqual(
      rows.map((row) => row.gameId),
      ["soon", "late"],
    );
    assert.equal(rows[0]?.day, "Thu");
    assert.equal(rows[0]?.time, "7:00 PM");
    assert.equal(rows[0]?.detail, "Ace Padel, 2 of 4 in");
  });

  it("is empty when nothing has room", () => {
    assert.deepEqual(
      openWeekRows([game({ canRegister: false })], NOW, "en"),
      [],
    );
  });
});
