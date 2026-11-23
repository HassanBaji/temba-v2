import { describe, expect, it } from "vitest";

import { americanoTable } from "./tournament-americano";
import {
  americanoHeroStats,
  americanoPlayedCardModel,
  americanoPlayedSummary,
  americanoResultMark,
  americanoRoundStarts,
  americanoShareCard,
  signedDifference,
  viewerAmericanoFocus,
  viewerAmericanoMatches,
  type AmericanoViewMatch,
} from "./tournament-americano-view";

const players = [
  { gamePlayerId: "a", name: "Ahmed Buhazza" },
  { gamePlayerId: "b", name: "Dana Al-Khalifa" },
  { gamePlayerId: "c", name: "Hassan Haji" },
  { gamePlayerId: "d", name: "Khalid Janahi" },
];

function match(
  roundNumber: number,
  slot1: [string, string],
  slot2: [string, string],
  score: [number, number] | null,
  state: AmericanoViewMatch["state"] = score ? "confirmed" : "scheduled",
): AmericanoViewMatch {
  return {
    roundNumber,
    courtName: "Court 1",
    startTime: new Date(`2026-09-25T0${8 + roundNumber}:00:00`),
    state,
    slot1PlayerIds: slot1,
    slot2PlayerIds: slot2,
    slot1GamesWon: score?.[0] ?? null,
    slot2GamesWon: score?.[1] ?? null,
  };
}

const day = [
  match(2, ["a", "c"], ["b", "d"], [6, 3]),
  match(1, ["a", "b"], ["c", "d"], [6, 4]),
  match(3, ["a", "d"], ["b", "c"], [5, 5]),
];

describe("viewerAmericanoMatches", () => {
  it("lists the viewer's Match in every Round, first Round first, from their side", () => {
    const played = viewerAmericanoMatches(day, "c");
    expect(played.map((entry) => entry.roundNumber)).toEqual([1, 2, 3]);
    expect(played[0]).toMatchObject({
      partnerId: "d",
      opponentIds: ["a", "b"],
      mine: 4,
      theirs: 6,
      outcome: "lost",
    });
    expect(played.map((entry) => entry.outcome)).toEqual([
      "lost",
      "won",
      "drawn",
    ]);
  });

  it("gives no outcome until the score is confirmed, and nothing to a non-player", () => {
    const pending = [
      match(1, ["a", "b"], ["c", "d"], [6, 4], "awaiting_confirmation"),
    ];
    expect(viewerAmericanoMatches(pending, "a")[0]?.outcome).toBeNull();
    expect(viewerAmericanoMatches(pending, "a")[0]?.mine).toBe(6);
    expect(viewerAmericanoMatches(day, "z")).toEqual([]);
    expect(viewerAmericanoMatches(day, null)).toEqual([]);
  });
});

describe("viewerAmericanoFocus", () => {
  const live = [
    match(1, ["a", "b"], ["c", "d"], [6, 4]),
    match(2, ["a", "c"], ["b", "d"], null, "on_court"),
    match(3, ["a", "d"], ["b", "c"], null, "scheduled"),
  ];

  it("shows the viewer's Match in the Round on court first", () => {
    const focus = viewerAmericanoFocus(viewerAmericanoMatches(live, "a"), 2);
    expect(focus?.roundNumber).toBe(2);
  });

  it("falls back to the viewer's next Match, and to none once all are played", () => {
    const next = viewerAmericanoFocus(viewerAmericanoMatches(live, "a"), 1);
    expect(next?.roundNumber).toBe(2);
    expect(
      viewerAmericanoFocus(viewerAmericanoMatches(day, "a"), 3),
    ).toBeNull();
  });
});

describe("americanoPlayedSummary", () => {
  const table = americanoTable(
    players.map((player) => player.gamePlayerId),
    day.map((entry) => ({
      slot1: entry.slot1PlayerIds,
      slot2: entry.slot2PlayerIds,
      slot1GamesWon: entry.slot1GamesWon ?? 0,
      slot2GamesWon: entry.slot2GamesWon ?? 0,
    })),
  );

  it("gives the viewer's place, games won, partners and results, and the winner", () => {
    const summary = americanoPlayedSummary({
      players,
      matches: day,
      table,
      viewerGamePlayerId: "c",
      roundCount: 3,
      matchMinutes: 30,
      finished: true,
    });
    expect(summary).toMatchObject({
      finished: true,
      playerCount: 4,
      gamesWon: 15,
      partnerCount: 3,
      results: ["lost", "won", "drawn"],
      viewer: { markName: "Hassan Haji" },
    });
    expect(summary?.place).toBe(
      table.find((row) => row.playerId === "c")?.place,
    );
    expect(summary?.winner?.name).toBe(
      players.find((player) => player.gamePlayerId === table[0]?.playerId)
        ?.name,
    );
  });

  it("holds the place and the winner back until the day is finished", () => {
    const summary = americanoPlayedSummary({
      players,
      matches: day,
      table,
      viewerGamePlayerId: "c",
      roundCount: 3,
      matchMinutes: 30,
      finished: false,
    });
    expect(summary?.place).toBeNull();
    expect(summary?.winner).toBeNull();
  });

  it("has no summary for someone not in the table", () => {
    expect(
      americanoPlayedSummary({
        players,
        matches: day,
        table,
        viewerGamePlayerId: "z",
        roundCount: 3,
        matchMinutes: 30,
        finished: true,
      }),
    ).toBeNull();
  });

  it("reads as the Played card headline", () => {
    const summary = americanoPlayedSummary({
      players,
      matches: day,
      table,
      viewerGamePlayerId: "c",
      roundCount: 3,
      matchMinutes: 30,
      finished: true,
    })!;
    const card = americanoPlayedCardModel(
      {
        name: "Sunday Social",
        windowStart: new Date("2026-09-25T09:00:00"),
        displayTime: new Date("2026-09-25T09:00:00"),
        venue: { name: "World Padel Academy" },
        americano: summary,
      },
      "en",
    );
    expect(card.headline).toMatch(/^Finished \d+(st|nd|rd|th) of 4$/);
    expect(card.viewerLine).toBe("15 games won, 3 partners");
  });
});

describe("americanoRoundStarts", () => {
  it("runs the Rounds back to back, waiting for Courts when fewer are recorded", () => {
    const start = new Date("2026-09-25T09:00:00");
    const full = americanoRoundStarts({
      windowStart: start,
      roundCount: 3,
      matchMinutes: 30,
      players: 16,
      recordedCourts: 4,
    });
    expect(
      full.map(
        (entry) => entry.start.getHours() * 60 + entry.start.getMinutes(),
      ),
    ).toEqual([540, 570, 600]);
    const waiting = americanoRoundStarts({
      windowStart: start,
      roundCount: 2,
      matchMinutes: 30,
      players: 16,
      recordedCourts: 2,
    });
    expect(waiting[1]?.start.getHours()).toBe(10);
  });

  it("has no schedule without a start or a game length", () => {
    expect(
      americanoRoundStarts({
        windowStart: null,
        roundCount: 3,
        matchMinutes: 30,
        players: 8,
        recordedCourts: 2,
      }),
    ).toEqual([]);
  });
});

describe("americanoHeroStats", () => {
  it("shows the players, the Rounds and the price per player", () => {
    expect(
      americanoHeroStats(
        {
          playersAllowed: 16,
          roundCount: 7,
          matchMinutes: 30,
          pricePerPlayerFils: 3500,
        },
        "en",
      ),
    ).toEqual([
      { value: "16", label: "players, alone" },
      { value: "7", label: "rounds of 30 min" },
      { value: "3.500", label: "BD per player" },
    ]);
  });
});

describe("signedDifference and americanoResultMark", () => {
  it("signs a game difference with a real minus", () => {
    expect([7, 0, -2].map(signedDifference)).toEqual(["+7", "0", "−2"]);
  });

  it("draws a drawn Match as a draw and an unplayed one as not played", () => {
    expect(americanoResultMark("drawn")).toBe("draw");
    expect(americanoResultMark("won")).toBe("won");
    expect(americanoResultMark(null)).toBe("not-played");
  });
});

describe("americanoShareCard", () => {
  const table = americanoTable(
    players.map((player) => player.gamePlayerId),
    day.map((entry) => ({
      slot1: entry.slot1PlayerIds,
      slot2: entry.slot2PlayerIds,
      slot1GamesWon: entry.slot1GamesWon ?? 0,
      slot2GamesWon: entry.slot2GamesWon ?? 0,
    })),
  );
  const base = {
    name: "Sunday Social",
    windowStart: new Date("2026-09-25T09:00:00"),
    venueName: "World Padel Academy",
    players,
    matches: day,
    table,
    finished: true,
  };

  it("shares a player's place, games won and results", () => {
    const card = americanoShareCard({ ...base, viewerGamePlayerId: "c" }, "en");
    expect(card?.kind).toBe("placing");
    if (card?.kind === "placing") {
      expect(card.tag).toBe("Americano");
      expect(card.team).toBe("Hassan Haji");
      expect(card.record).toMatch(/^15 games won\./);
      expect(card.results).toEqual(["lost", "won", "draw"]);
    }
  });

  it("shares the top of the table for someone who did not play", () => {
    const card = americanoShareCard(
      { ...base, viewerGamePlayerId: null },
      "en",
    );
    expect(card?.kind).toBe("table");
    if (card?.kind === "table") {
      expect(card.rows).toHaveLength(4);
      expect(card.rows[0]?.points).toBe(`${table[0]?.gamesWon} GW`);
    }
  });

  it("shares the table, with the viewer's line marked, when they choose it", () => {
    const card = americanoShareCard(
      { ...base, viewerGamePlayerId: "c" },
      "en",
      "table",
    );
    expect(card?.kind).toBe("table");
    if (card?.kind === "table") {
      expect(card.rows.filter((row) => row.isViewer)).toEqual([
        expect.objectContaining({ team: "Hassan Haji" }),
      ]);
    }
  });

  it("has nothing to share before the day is finished", () => {
    expect(
      americanoShareCard(
        { ...base, viewerGamePlayerId: "c", finished: false },
        "en",
      ),
    ).toBeNull();
  });
});
