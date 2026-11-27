import { describe, expect, it } from "vitest";

import { gameEditSeries, type GameEditSeriesGame } from "./game-edit-series";

const sunday = {
  id: "sunday",
  name: "Sunday Social",
  emblem: "cup",
  colour: "gold",
  edition: 12,
} as const;

function game(overrides: Partial<GameEditSeriesGame> = {}): GameEditSeriesGame {
  return {
    id: "game-1",
    groupId: "group-1",
    windowStart: new Date("2026-12-06T17:00:00Z"),
    series: null,
    canChangeSeries: true,
    seriesScoreLocked: false,
    ...overrides,
  };
}

describe("gameEditSeries", () => {
  it("shows the section when the Group runs a Series the Game may join", () => {
    expect(gameEditSeries(game(), [sunday]).shown).toBe(true);
    expect(gameEditSeries(game(), []).shown).toBe(false);
  });

  it("shows the Game's own Series whatever the Group runs", () => {
    const edit = gameEditSeries(game({ series: sunday }), []);
    expect(edit.shown).toBe(true);
    expect(edit.context.current).toBe(sunday);
  });

  it("locks the row only once the score is in", () => {
    const open = gameEditSeries(game({ series: sunday }), [sunday]);
    expect(open.context.scoreLocked).toBe(false);

    const scored = gameEditSeries(
      game({
        series: sunday,
        canChangeSeries: false,
        seriesScoreLocked: true,
      }),
      [],
    );
    expect(scored.context.scoreLocked).toBe(true);
  });

  it("leaves the row open on a Group that is no longer Verified, so the Series can be removed", () => {
    const edit = gameEditSeries(
      game({ series: sunday, canChangeSeries: false }),
      [],
    );
    expect(edit.shown).toBe(true);
    expect(edit.context.canChange).toBe(false);
    expect(edit.context.scoreLocked).toBe(false);
  });
});
