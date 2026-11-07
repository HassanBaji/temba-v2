import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import { formatGameCardDay, formatGameStart } from "./format-game-start";
import {
  GAME_WINDOW_FINISH_SLOTS,
  GAME_WINDOW_TIME_SLOTS,
  formatGameWindowName,
  formatTimeSlotLabel,
  gameEditWindowChoices,
  gameWindowFinishSlots,
  parseGameDateTime,
  parseRequiredGameWindow,
  snapTimeInputValue,
  splitGameWindow,
  upcomingGameWindowFinishSlots,
  upcomingGameWindowTimeSlots,
} from "./game-window";

const NOON = bahrainDate(2026, 10, 7, 12, 0);

describe("Game window slots", () => {
  it("starts a day at 00:30 and closes it at the next midnight", () => {
    assert.equal(GAME_WINDOW_TIME_SLOTS[0], "00:30");
    assert.equal(GAME_WINDOW_TIME_SLOTS.at(-1), "24:00");
    assert.equal(GAME_WINDOW_TIME_SLOTS.length, 48);
    assert.equal(GAME_WINDOW_FINISH_SLOTS.at(-1), "27:00");
  });

  it("offers finish slots after the start, into the small hours", () => {
    assert.deepEqual(gameWindowFinishSlots("23:00"), [
      "23:30",
      "24:00",
      "24:30",
      "25:00",
      "25:30",
      "26:00",
      "26:30",
      "27:00",
    ]);
    assert.deepEqual(gameWindowFinishSlots("24:00", "allowed").slice(0, 2), [
      "24:00",
      "24:30",
    ]);
    assert.deepEqual(
      upcomingGameWindowFinishSlots("2026-11-07", "", NOON),
      upcomingGameWindowTimeSlots("2026-11-07", NOON),
    );
    assert.deepEqual(
      upcomingGameWindowFinishSlots("2026-11-07", "22:30", NOON).slice(0, 3),
      ["23:00", "23:30", "24:00"],
    );
  });

  it("keeps the closing midnight as today's last start", () => {
    const lateEvening = bahrainDate(2026, 10, 7, 23, 45);
    assert.deepEqual(upcomingGameWindowTimeSlots("2026-11-07", lateEvening), [
      "24:00",
    ]);
    assert.deepEqual(
      upcomingGameWindowTimeSlots("2026-11-07", bahrainDate(2026, 10, 8, 0, 0)),
      [],
    );
    assert.equal(
      upcomingGameWindowTimeSlots(
        "2026-11-08",
        bahrainDate(2026, 10, 8, 0, 10),
      )[0],
      "00:30",
    );
  });

  it("labels slots past midnight with the next morning's clock", () => {
    assert.match(formatTimeSlotLabel("24:00", "en"), /^12:00\sAM$/u);
    assert.match(formatTimeSlotLabel("25:30", "en"), /^1:30\sAM$/u);
    assert.equal(snapTimeInputValue("23:45"), "24:00");
    assert.equal(snapTimeInputValue("25:20"), "25:30");
  });
});

describe("Game window parsing", () => {
  it("rolls hours of 24 and more into the next day", () => {
    assert.equal(
      parseGameDateTime("2026-11-07", "24:00")?.toISOString(),
      bahrainDate(2026, 10, 8, 0, 0).toISOString(),
    );
    assert.equal(
      parseGameDateTime("2026-11-07", "25:30")?.toISOString(),
      bahrainDate(2026, 10, 8, 1, 30).toISOString(),
    );
    assert.equal(
      parseGameDateTime("2026-11-30", "24:30")?.toISOString(),
      bahrainDate(2026, 11, 1, 0, 30).toISOString(),
    );
    assert.equal(parseGameDateTime("2026-02-30", "20:00"), undefined);
    const window = parseRequiredGameWindow("2026-11-07", "22:30", "24:00");
    assert.equal(
      window?.windowEnd.toISOString(),
      bahrainDate(2026, 10, 8, 0, 0).toISOString(),
    );
  });

  it("splits a late window back onto the day it was picked on", () => {
    assert.deepEqual(
      splitGameWindow(
        bahrainDate(2026, 10, 7, 22, 30),
        bahrainDate(2026, 10, 8, 0, 0),
      ),
      { day: "2026-11-07", startTime: "22:30", finishTime: "24:00" },
    );
    assert.deepEqual(
      splitGameWindow(
        bahrainDate(2026, 10, 8, 0, 0),
        bahrainDate(2026, 10, 8, 1, 30),
      ),
      { day: "2026-11-07", startTime: "24:00", finishTime: "25:30" },
    );
    assert.deepEqual(
      splitGameWindow(
        bahrainDate(2026, 10, 8, 0, 30),
        bahrainDate(2026, 10, 8, 2, 0),
      ),
      { day: "2026-11-08", startTime: "00:30", finishTime: "02:00" },
    );
    assert.deepEqual(splitGameWindow(null, null), {
      day: "",
      startTime: "",
      finishTime: "",
    });
  });

  it("round-trips every start and finish slot", () => {
    for (const startTime of GAME_WINDOW_TIME_SLOTS) {
      for (const finishTime of gameWindowFinishSlots(startTime)) {
        const window = parseRequiredGameWindow(
          "2026-11-07",
          startTime,
          finishTime,
        );
        assert.ok(window, `${startTime} to ${finishTime}`);
        assert.deepEqual(
          splitGameWindow(window.windowStart, window.windowEnd),
          { day: "2026-11-07", startTime, finishTime },
        );
      }
    }
  });
});

describe("Game window names and days", () => {
  it("names a late window on the day it was picked on", () => {
    assert.match(
      formatGameWindowName("2026-11-07", "22:30", "24:00", "en"),
      /^Sat.*10:30\sPM.*12:00\sAM$/u,
    );
  });

  it("lists a midnight start under the evening before", () => {
    const midnight = bahrainDate(2026, 0, 4, 0, 0);
    assert.match(formatGameStart(midnight, "en"), /^Sat 3 Jan, 12:00\sAM$/u);
    assert.match(formatGameCardDay(midnight, "en"), /^Saturday 3 Jan$/u);
  });

  it("keeps the current late finish among the edit choices", () => {
    const choices = gameEditWindowChoices(
      { day: "2026-11-07", startTime: "24:00", finishTime: "25:30" },
      NOON,
    );
    assert.ok(choices.startSlots.includes("24:00"));
    assert.deepEqual(choices.finishSlots.slice(0, 3), [
      "24:30",
      "25:00",
      "25:30",
    ]);
  });
});
