import { describe, expect, it } from "vitest";

import {
  ratingHistoryRow,
  tierHistoryScreen,
  type RatingHistoryEntryData,
  type TierHistoryData,
} from "./rating-history";

/** Thursdays in the product timezone, as on screen 2e. */
const THU_12_NOV = new Date("2026-11-12T17:00:00Z");
const THU_5_NOV = new Date("2026-11-05T17:00:00Z");
const THU_29_OCT = new Date("2026-10-29T17:00:00Z");

function game(
  overrides: Partial<Extract<RatingHistoryEntryData, { kind: "tier_game" }>>,
): RatingHistoryEntryData {
  return {
    kind: "tier_game",
    id: "game",
    at: THU_12_NOV,
    playedAt: THU_12_NOV,
    delta: 19,
    resultDelta: 10,
    performanceDelta: 9,
    ratingHundredths: 810,
    pointsBefore: 1229,
    pointsAfter: 1248,
    score: { own: 5, opponent: 3 },
    ...overrides,
  };
}

const ADJUSTMENT: RatingHistoryEntryData = {
  kind: "tier_adjustment",
  id: "adjustment",
  at: THU_29_OCT,
  delta: 40,
  pointsBefore: 1180,
  pointsAfter: 1220,
  setBy: { userId: "hussain", name: "Hussain A" },
  reason: "new_to_group",
  note: "New to the group but plays Div 1. Starting him near his Level.",
};

describe("ratingHistoryRow", () => {
  it("reads a won Game with its rating and both parts", () => {
    expect(ratingHistoryRow(game({}), "viewer", "en")).toMatchObject({
      title: "Won 5–3, rated 8.1",
      detail: "Thu 12 Nov. Result +10, performance +9",
      byline: null,
      delta: "+19",
    });
  });

  it("reads a lost Game with a zero performance part", () => {
    const row = ratingHistoryRow(
      game({
        at: THU_5_NOV,
        playedAt: THU_5_NOV,
        delta: -11,
        resultDelta: -11,
        performanceDelta: 0,
        ratingHundredths: 600,
        score: { own: 2, opponent: 4 },
      }),
      "viewer",
      "en",
    );
    expect(row.title).toBe("Lost 2–4, rated 6.0");
    expect(row.detail).toBe("Thu 5 Nov. Result −11, performance 0");
    expect(row.delta).toBe("−11");
  });

  it("drops the rating and performance part when the Game had none", () => {
    const row = ratingHistoryRow(
      game({
        delta: 0,
        resultDelta: 0,
        performanceDelta: 0,
        ratingHundredths: null,
        score: { own: 3, opponent: 3 },
      }),
      "viewer",
      "en",
    );
    expect(row.title).toBe("Drew 3–3");
    expect(row.detail).toBe("Thu 12 Nov. Result 0");
    expect(row.delta).toBe("0");
  });

  it("falls back to a plain Group game without a score", () => {
    expect(
      ratingHistoryRow(game({ score: null, ratingHundredths: null }), "v", "en")
        .title,
    ).toBe("Group game");
  });

  it("names the Organizer, the reason and the note on an adjustment", () => {
    expect(ratingHistoryRow(ADJUSTMENT, "mahmood", "en")).toMatchObject({
      title: "Set by an organizer",
      detail: "Thu 29 Oct, 1,180 to 1,220",
      byline:
        "Hussain A, New here, known level: “New to the group but plays Div 1. Starting him near his Level.”",
      delta: "+40",
    });
  });

  it("says You when the viewer made the change, and reads without a note", () => {
    const row = ratingHistoryRow(
      { ...ADJUSTMENT, note: null, delta: -59 },
      "hussain",
      "en",
    );
    expect(row.byline).toBe("You, New here, known level");
    expect(row.delta).toBe("−59");
  });

  it("speaks the whole line", () => {
    expect(ratingHistoryRow(game({}), "viewer", "en").spoken).toBe(
      "Won 5–3, rated 8.1. Thu 12 Nov. Result +10, performance +9. +19 points",
    );
  });

  it("has Arabic copy", () => {
    const row = ratingHistoryRow(ADJUSTMENT, "mahmood", "ar");
    expect(row.title).toBe("حدّدها منظّم");
    expect(row.byline).toContain("Hussain A");
    expect(row.byline).toContain("جديد هنا، مستواه معروف");
  });
});

function data(overrides: Partial<TierHistoryData> = {}): TierHistoryData {
  return {
    member: {
      userId: "mahmood",
      name: "Mahmood S",
      image: null,
      isViewer: false,
    },
    tier: {
      band: "kanaad",
      place: 4,
      rankedCount: 13,
      points: 1248,
      provisional: false,
      gamesOfFive: 5,
      gamesCounted: 31,
      nextBand: "hamour",
      pointsToNextBand: 53,
    },
    entries: [game({}), ADJUSTMENT],
    ...overrides,
  };
}

describe("tierHistoryScreen", () => {
  it("heads screen 2e with the fish, place, points and the gap above", () => {
    const screen = tierHistoryScreen(data(), "hussain", "en");
    expect(screen.title).toBe("Points and history");
    expect(screen.header).toEqual({
      name: "Mahmood S",
      caption: "31 group games",
      band: "kanaad",
      bandLabel: "Kanaad",
      standing: "Kanaad, #4 of 13",
      provisional: false,
      points: "1,248",
      toNextBand: "53 to Hamour",
    });
    expect(screen.listTitle).toBe("What moved it");
    expect(screen.countLabel).toBe("last 2");
    expect(screen.rows.map((row) => row.key)).toEqual(["game", "adjustment"]);
    expect(screen.emptyText).toBeNull();
    expect(screen.footnote).toBe(
      "Mahmood sees this same list. Nothing here changes a Temba Level.",
    );
  });

  it("reads a Provisional member by games played", () => {
    const screen = tierHistoryScreen(
      data({
        tier: {
          band: null,
          place: null,
          rankedCount: 11,
          points: 1212,
          provisional: true,
          gamesOfFive: 3,
          gamesCounted: 3,
          nextBand: null,
          pointsToNextBand: null,
        },
      }),
      "hussain",
      "en",
    );
    expect(screen.header.standing).toBe("Provisional, 3 of 5 games");
    expect(screen.header.provisional).toBe(true);
    expect(screen.header.toNextBand).toBeNull();
  });

  it("shows the place without a fish while few are ranked", () => {
    const screen = tierHistoryScreen(
      data({
        tier: {
          band: null,
          place: 2,
          rankedCount: 3,
          points: 1210,
          provisional: false,
          gamesOfFive: 5,
          gamesCounted: 6,
          nextBand: null,
          pointsToNextBand: null,
        },
      }),
      "hussain",
      "en",
    );
    expect(screen.header.standing).toBe("#2 of 3");
    expect(screen.header.bandLabel).toBeNull();
  });

  it("has an empty list for a member nothing has moved", () => {
    const screen = tierHistoryScreen(
      data({ tier: null, entries: [] }),
      "hussain",
      "en",
    );
    expect(screen.header.points).toBeNull();
    expect(screen.header.caption).toBe("0 group games");
    expect(screen.countLabel).toBeNull();
    expect(screen.emptyText).toBe(
      "Nothing has moved these points yet. They move after each group game.",
    );
  });

  it("tells the member themself who else sees it", () => {
    const screen = tierHistoryScreen(
      data({
        member: {
          userId: "mahmood",
          name: "Mahmood S",
          image: null,
          isViewer: true,
        },
      }),
      "mahmood",
      "en",
    );
    expect(screen.footnote).toBe(
      "Your group’s organizers see this same list. Nothing here changes your Temba Level.",
    );
  });
});
