import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gameLevelRangeSaveInput, gameWindowSaveInput } from "./game-edit-save";
import { LEVEL_RANGE_INVERTED_MESSAGE } from "./level-range";
import { gameEditWindowChoices } from "./game-window";

describe("gameWindowSaveInput", () => {
  it("names the window and returns both instants", () => {
    const input = gameWindowSaveInput("2030-01-15", "18:00", "19:30");
    assert.ok(input);
    assert.equal(input.name.includes("6:00"), true);
    assert.ok(input.windowStart.getTime() < input.windowEnd.getTime());
  });

  it("returns null when the day or a time is missing", () => {
    assert.equal(gameWindowSaveInput("", "18:00", "19:30"), null);
    assert.equal(gameWindowSaveInput("2030-01-15", "", "19:30"), null);
  });
});

describe("gameLevelRangeSaveInput", () => {
  it("treats none on both bounds as no range", () => {
    assert.deepEqual(gameLevelRangeSaveInput("none", "none"), {
      ok: true,
      input: { levelMinTenths: null, levelMaxTenths: null },
    });
  });

  it("turns bands into the widest tenths for each bound", () => {
    const result = gameLevelRangeSaveInput("C", "B");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(typeof result.input.levelMinTenths, "number");
      assert.ok(result.input.levelMinTenths! < result.input.levelMaxTenths!);
    }
  });

  it("refuses a minimum above the maximum", () => {
    assert.deepEqual(gameLevelRangeSaveInput("B", "C"), {
      ok: false,
      message: LEVEL_RANGE_INVERTED_MESSAGE,
    });
  });
});

describe("gameEditWindowChoices", () => {
  const now = new Date("2030-01-15T06:00:00Z");

  it("keeps the Game's current day even when it is not offered", () => {
    const { days } = gameEditWindowChoices(
      { day: "2029-12-01", startTime: "18:00", finishTime: "19:30" },
      now,
    );
    assert.equal(days[0], "2029-12-01");
    assert.equal(days.length, 15);
  });

  it("keeps the current times and only offers finishes after the start", () => {
    const { startSlots, finishSlots } = gameEditWindowChoices(
      { day: "2030-01-20", startTime: "18:00", finishTime: "19:30" },
      now,
    );
    assert.equal(startSlots.includes("18:00"), true);
    assert.equal(finishSlots.includes("17:30"), false);
    assert.equal(finishSlots.includes("19:30"), true);
  });

  it("adds a current start that has already passed today", () => {
    const { startSlots } = gameEditWindowChoices(
      { day: "2030-01-15", startTime: "00:30", finishTime: "02:00" },
      now,
    );
    assert.equal(startSlots.includes("00:30"), true);
  });
});
