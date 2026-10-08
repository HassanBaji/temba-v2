import { describe, expect, it } from "vitest";

import { createPlayerProfileFixtures } from "./player-profile-fixtures";
import {
  lastTenSummary,
  levelChangeLabel,
  levelTrendLabel,
  playerMatchKindLabel,
  playerMatchRowView,
  type PlayerMatchGame,
} from "./player-profile-matches";

const fixtures = createPlayerProfileFixtures();

const FRIENDLY: PlayerMatchGame = {
  name: "Evening padel",
  format: "friendly_game",
  groupName: null,
  roundNumber: null,
  knockoutRound: null,
  venueName: "Padelhuset",
};

function day(date: string) {
  return new Date(`${date}T17:00:00.000Z`);
}

describe("playerMatchKindLabel", () => {
  it("names a Friendly game by its Group, or plainly without one", () => {
    expect(
      playerMatchKindLabel({ ...FRIENDLY, groupName: "Tuesday Crew" }),
    ).toBe("Tuesday Crew");
    expect(playerMatchKindLabel(FRIENDLY)).toBe("Friendly game");
  });

  it("names a Pool Match by the tournament and its Round", () => {
    const pool = { ...FRIENDLY, format: "friendly_tournament", roundNumber: 2 };
    expect(playerMatchKindLabel({ ...pool, name: "Autumn Cup" })).toBe(
      "Autumn Cup, Round 2",
    );
    expect(playerMatchKindLabel({ ...pool, name: null })).toBe(
      "Friendly tournament, Round 2",
    );
  });

  it("names a Knockout Match by its Knockout round", () => {
    const knockout = {
      ...FRIENDLY,
      name: "Autumn Cup",
      format: "friendly_tournament",
      roundNumber: null,
    };
    expect(
      playerMatchKindLabel({
        ...knockout,
        knockoutRound: { round: 2, roundCount: 2 },
      }),
    ).toBe("Autumn Cup, Final");
    expect(
      playerMatchKindLabel({
        ...knockout,
        name: " ",
        knockoutRound: { round: 1, roundCount: 3 },
      }),
    ).toBe("Friendly tournament, Quarter-final");
  });

  it("names every Americano Match plainly", () => {
    expect(
      playerMatchKindLabel({
        ...FRIENDLY,
        format: "americano",
        groupName: "Tuesday Crew",
        roundNumber: 3,
      }),
    ).toBe("Americano");
  });
});

describe("levelChangeLabel", () => {
  it("shows one decimal with a sign", () => {
    expect(levelChangeLabel(0.1)).toBe("+0.1");
    expect(levelChangeLabel(-0.1)).toBe("−0.1");
    expect(levelChangeLabel(0)).toBe("0.0");
    expect(levelChangeLabel(0.30000000000000004)).toBe("+0.3");
  });
});

describe("levelTrendLabel", () => {
  it("reads the Last 10 trend and hides with no rated Match", () => {
    expect(levelTrendLabel({ levelChange: 0.2 })).toBe("Last 10: +0.2");
    expect(levelTrendLabel({ levelChange: -0.3 })).toBe("Last 10: −0.3");
    expect(levelTrendLabel(null)).toBeNull();
  });
});

describe("playerMatchRowView", () => {
  it("reads opponents, date, kind, Sets and the delta", () => {
    const row = playerMatchRowView(fixtures.confirmed.lastMatches[0]!);
    expect(row).toEqual({
      matchId: "match-2026-10-01",
      outcome: "won",
      opponents: "vs Sofia L & Adam R",
      meta: "Thu 1 Oct, Tuesday Crew",
      sets: ["6–4", "6–3"],
      delta: "+0.1",
      accessibilityLabel:
        "Won against Sofia L and Adam R, Thursday 1 October, Tuesday Crew, 6–4 6–3, rating up 0.1",
    });
  });

  it("reads Set scores from the owner's side when they sat in slot 2", () => {
    const row = playerMatchRowView(fixtures.provisional.lastMatches[0]!);
    expect(row.opponents).toBe("vs Sofia L & Adam R");
    expect(row.sets).toEqual(["6–4", "7–6"]);
  });

  it("shows no delta for an unrated Match", () => {
    const row = playerMatchRowView(fixtures.confirmed.lastMatches[4]!);
    expect(row.delta).toBeNull();
    expect(row.meta).toBe("Sun 20 Sep, Friendly game");
    expect(row.accessibilityLabel).not.toContain("rating");
  });

  it("speaks a flat and a falling rating", () => {
    expect(
      playerMatchRowView(fixtures.confirmed.lastMatches[1]!).accessibilityLabel,
    ).toMatch(/rating unchanged$/);
    expect(
      playerMatchRowView(fixtures.confirmed.lastMatches[7]!).accessibilityLabel,
    ).toMatch(/^Lost against .*rating down 0\.1$/);
  });

  it("labels every format in the confirmed Last 10", () => {
    expect(
      fixtures.confirmed.lastMatches
        .slice(0, 5)
        .map((match) => playerMatchKindLabel(match.game)),
    ).toEqual([
      "Tuesday Crew",
      "Autumn Cup, Round 2",
      "Autumn Cup, Semi-final",
      "Americano",
      "Friendly game",
    ]);
  });
});

describe("lastTenSummary", () => {
  it("counts the record and puts the newest mark first", () => {
    const summary = lastTenSummary(fixtures.confirmed.lastMatches);
    expect(summary.record).toBe("7 won, 3 lost");
    expect(summary.marks).toEqual([
      "won",
      "won",
      "won",
      "won",
      "lost",
      "won",
      "won",
      "lost",
      "won",
      "lost",
    ]);
    expect(summary.ends).toEqual({ newest: "Latest", oldest: "Sat 5 Sep" });
    expect(summary.seeAll).toBe("See all 10 games");
  });

  it("adds draws to the record and fills hatched slots", () => {
    const summary = lastTenSummary([
      { outcome: "draw", playedAt: day("2026-10-01") },
      { outcome: "won", playedAt: day("2026-09-28") },
      { outcome: "lost", playedAt: day("2026-09-26") },
    ]);
    expect(summary.record).toBe("1 won, 1 lost, 1 drawn");
    expect(summary.marks).toEqual([
      "draw",
      "won",
      "lost",
      ...Array.from({ length: 7 }, () => "not-played"),
    ]);
    expect(summary.ends?.oldest).toBe("Sat 26 Sep");
    expect(summary.seeAll).toBe("See all 3 games");
  });

  it("reads one game in the singular", () => {
    expect(
      lastTenSummary([{ outcome: "won", playedAt: day("2026-10-01") }]).seeAll,
    ).toBe("See all 1 game");
  });

  it("reads No games yet with ten hatched slots and no See all", () => {
    expect(lastTenSummary([])).toEqual({
      record: "No games yet.",
      marks: Array.from({ length: 10 }, () => "not-played"),
      ends: null,
      seeAll: null,
    });
  });

  it("never shows more than ten marks", () => {
    const eleven = Array.from({ length: 11 }, () => ({
      outcome: "won" as const,
      playedAt: day("2026-10-01"),
    }));
    expect(lastTenSummary(eleven).marks).toHaveLength(10);
    expect(lastTenSummary(eleven).record).toBe("10 won, 0 lost");
  });
});
