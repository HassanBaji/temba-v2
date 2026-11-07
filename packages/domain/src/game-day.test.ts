import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  endsInsideGameDay,
  gameDayKey,
  gameDayMinutes,
  gameDayStart,
  minutesIntoGameDay,
} from "./game-day";

describe("gameDayStart", () => {
  it("is the day's midnight for a start inside the day", () => {
    assert.equal(
      gameDayStart(bahrainDate(2026, 10, 7, 22, 30)).toISOString(),
      bahrainDate(2026, 10, 7).toISOString(),
    );
    assert.equal(
      gameDayStart(bahrainDate(2026, 10, 7, 0, 30)).toISOString(),
      bahrainDate(2026, 10, 7).toISOString(),
    );
  });

  it("gives a midnight start to the evening before", () => {
    assert.equal(
      gameDayStart(bahrainDate(2026, 10, 8, 0, 0)).toISOString(),
      bahrainDate(2026, 10, 7).toISOString(),
    );
    assert.equal(gameDayKey(bahrainDate(2026, 10, 8, 0, 0)), "2026-11-07");
    assert.equal(gameDayKey(bahrainDate(2026, 10, 8, 0, 0, 1)), "2026-11-08");
  });
});

describe("minutesIntoGameDay", () => {
  it("counts wall-clock minutes past the day's midnight", () => {
    const day = bahrainDate(2026, 10, 7);
    assert.equal(
      minutesIntoGameDay(day, bahrainDate(2026, 10, 7, 22, 30)),
      1350,
    );
    assert.equal(minutesIntoGameDay(day, bahrainDate(2026, 10, 8, 0, 0)), 1440);
    assert.equal(
      minutesIntoGameDay(day, bahrainDate(2026, 10, 8, 1, 30)),
      1530,
    );
    assert.equal(gameDayMinutes(bahrainDate(2026, 10, 8, 0, 0)), 1440);
    assert.equal(gameDayMinutes(bahrainDate(2026, 10, 8, 0, 30)), 30);
  });
});

describe("endsInsideGameDay", () => {
  it("allows a finish up to 3:00 AM the next morning", () => {
    const start = bahrainDate(2026, 10, 7, 22, 30);
    assert.equal(
      endsInsideGameDay(start, bahrainDate(2026, 10, 8, 0, 0)),
      true,
    );
    assert.equal(
      endsInsideGameDay(start, bahrainDate(2026, 10, 8, 3, 0)),
      true,
    );
    assert.equal(
      endsInsideGameDay(start, bahrainDate(2026, 10, 8, 3, 30)),
      false,
    );
    assert.equal(
      endsInsideGameDay(
        bahrainDate(2026, 10, 8, 0, 0),
        bahrainDate(2026, 10, 8, 1, 30),
      ),
      true,
    );
  });
});
