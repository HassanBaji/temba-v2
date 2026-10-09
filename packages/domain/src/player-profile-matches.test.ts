import { describe, expect, it } from "vitest";

import { createPlayerProfileFixtures } from "./player-profile-fixtures";
import {
  filterLastTen,
  lastTenSummary,
  levelChangeLabel,
  levelTrendLabel,
  playerMatchKindLabel,
  playerMatchRowView,
  playerMatchSheetView,
  type PlayerMatchGame,
  type PlayerMatchInput,
} from "./player-profile-matches";

const fixtures = createPlayerProfileFixtures();
const ELIN_ID = fixtures.confirmed.player.id;

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
    const row = playerMatchRowView(fixtures.confirmed.lastMatches[0]!, ELIN_ID);
    expect(row).toEqual({
      matchId: "match-2026-10-01",
      outcome: "won",
      opponents: "vs Sofia L & Adam R",
      partnerVenue: "with Jonas B, Padelhuset Bromma",
      meta: "Thu 1 Oct, Tuesday Crew",
      sets: ["6–4", "6–3"],
      delta: "+0.1",
      accessibilityLabel:
        "Won against Sofia L and Adam R, Thursday 1 October, Tuesday Crew, 6–4 6–3, rating up 0.1",
    });
  });

  it("reads Set scores from the owner's side when they sat in slot 2", () => {
    const row = playerMatchRowView(
      fixtures.provisional.lastMatches[0]!,
      ELIN_ID,
    );
    expect(row.opponents).toBe("vs Sofia L & Adam R");
    expect(row.sets).toEqual(["6–4", "7–6"]);
  });

  it("names the partner from the owner's side, or just the Venue alone", () => {
    const slot2 = fixtures.provisional.lastMatches[0]!;
    expect(playerMatchRowView(slot2, ELIN_ID).partnerVenue).toBe(
      "with Jonas B, Padelhuset Bromma",
    );
    const alone = { ...slot2, slot2: slot2.slot2.slice(0, 1) };
    expect(playerMatchRowView(alone, ELIN_ID).partnerVenue).toBe(
      "Padelhuset Bromma",
    );
  });

  it("shows no delta for an unrated Match", () => {
    const row = playerMatchRowView(fixtures.confirmed.lastMatches[4]!, ELIN_ID);
    expect(row.delta).toBeNull();
    expect(row.meta).toBe("Sun 20 Sep, Friendly game");
    expect(row.accessibilityLabel).not.toContain("rating");
  });

  it("speaks a flat and a falling rating", () => {
    expect(
      playerMatchRowView(fixtures.confirmed.lastMatches[1]!, ELIN_ID)
        .accessibilityLabel,
    ).toMatch(/rating unchanged$/);
    expect(
      playerMatchRowView(fixtures.confirmed.lastMatches[7]!, ELIN_ID)
        .accessibilityLabel,
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

describe("filterLastTen", () => {
  const matches = fixtures.confirmed.lastMatches;

  it("labels the chips with live counts", () => {
    expect(filterLastTen(matches, "all").chips).toEqual([
      { filter: "all", label: "All 10", count: 10 },
      { filter: "won", label: "Won 7", count: 7 },
      { filter: "lost", label: "Lost 3", count: 3 },
    ]);
  });

  it("keeps the newest-first order inside a filter", () => {
    const lost = filterLastTen(matches, "lost");
    expect(lost.matches.map((match) => match.matchId)).toEqual([
      "match-2026-09-20",
      "match-2026-09-11",
      "match-2026-09-05",
    ]);
    expect(lost.empty).toBeNull();
    expect(filterLastTen(matches, "won").matches).toHaveLength(7);
    expect(filterLastTen(matches, "all").matches).toHaveLength(10);
  });

  it("shows draws under All only and reads All N below ten", () => {
    const draws = [
      { outcome: "draw" as const },
      { outcome: "won" as const },
      { outcome: "draw" as const },
    ];
    const all = filterLastTen(draws, "all");
    expect(all.chips.map((chip) => chip.label)).toEqual([
      "All 3",
      "Won 1",
      "Lost 0",
    ]);
    expect(all.matches).toHaveLength(3);
    expect(filterLastTen(draws, "won").matches).toEqual([{ outcome: "won" }]);
  });

  it("reads No games here. for an empty filter", () => {
    const lost = filterLastTen([{ outcome: "won" as const }], "lost");
    expect(lost.matches).toEqual([]);
    expect(lost.empty).toBe("No games here.");
    expect(filterLastTen([], "all").empty).toBe("No games here.");
  });

  it("never lists more than ten Matches", () => {
    const eleven = Array.from({ length: 11 }, () => ({
      outcome: "won" as const,
    }));
    expect(filterLastTen(eleven, "all").chips[0]?.label).toBe("All 10");
    expect(filterLastTen(eleven, "won").matches).toHaveLength(10);
  });
});

describe("playerMatchSheetView", () => {
  it("reads the kind, date, Venue, badge, both teams and Set chips", () => {
    const sheet = playerMatchSheetView(matchAt(0), "Elin Nilsson");
    expect(sheet.title).toBe("Tuesday Crew");
    expect(sheet.subtitle).toBe("Thu 1 Oct, Padelhuset Bromma");
    expect(sheet.badge).toBe("Won");
    expect(sheet.teams[0].players.map((player) => player.name)).toEqual([
      "Elin Nilsson",
      "Jonas Berg",
    ]);
    expect(sheet.teams[0].players[0]?.level).toBe("B 4.8");
    expect(sheet.teams[0].sets).toEqual([
      { games: 6, won: true },
      { games: 6, won: true },
    ]);
    expect(sheet.teams[1].sets).toEqual([
      { games: 4, won: false },
      { games: 3, won: false },
    ]);
    expect(sheet.canOpenGame).toBe(true);
  });

  it("hatches a Provisional player's Level", () => {
    const adam = playerMatchSheetView(matchAt(0), "Elin Nilsson").teams[1]
      .players[1];
    expect(adam?.level).toBeNull();
    expect(adam?.accessibilityLabel).toBe("Adam Ross, Level still Provisional");
  });

  it("puts the owner's team first when they sat in slot 2", () => {
    const sheet = playerMatchSheetView(
      fixtures.provisional.lastMatches[0]!,
      "Elin Nilsson",
    );
    expect(sheet.teams[0].players[0]?.userId).toBe(ELIN_ID);
    expect(sheet.teams[0].sets.map((set) => set.games)).toEqual([6, 7]);
    expect(sheet.teams[1].sets.map((set) => set.won)).toEqual([false, false]);
  });

  it("draws a drawn Set wash for both teams", () => {
    const drawn: PlayerMatchInput = {
      ...matchAt(0),
      outcome: "draw",
      sets: [
        { slot1GamesWon: 6, slot2GamesWon: 6 },
        { slot1GamesWon: 6, slot2GamesWon: 4 },
      ],
    };
    const sheet = playerMatchSheetView(drawn, "Elin Nilsson");
    expect(sheet.badge).toBe("Draw");
    expect(sheet.teams[0].sets[0]).toEqual({ games: 6, won: false });
    expect(sheet.teams[1].sets[0]).toEqual({ games: 6, won: false });
  });

  it("reads the rating line before to after with bands and one decimal", () => {
    const sheet = playerMatchSheetView(
      {
        ...matchAt(0),
        rating: {
          levelBefore: 3.9,
          levelAfter: 4.2,
          bandBefore: "C1",
          bandAfter: "B3",
          levelChange: 0.3,
        },
      },
      "Elin Nilsson",
    );
    expect(sheet.rating).toEqual({
      label: "Elin N's rating",
      before: "C+ 3.9",
      after: "B 4.2",
      delta: "+0.3",
      accessibilityLabel: "Elin N's rating, C+ 3.9 to B 4.2, rating up 0.3",
    });
  });

  it("has no rating line for an unrated Match and hides Open game", () => {
    const sheet = playerMatchSheetView(matchAt(4), "Elin Nilsson");
    expect(sheet.rating).toBeNull();
    expect(sheet.canOpenGame).toBe(false);
  });
});

function matchAt(index: number) {
  return fixtures.confirmed.lastMatches[index]!;
}
