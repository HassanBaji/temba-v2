import { describe, expect, it } from "vitest";

import {
  ratingHistoryLine,
  ratingHistoryRow,
  ratingHistoryScreen,
  tierHistoryScreen,
  type RatingHistoryEntryData,
  type RatingHistoryItemData,
  type RatingHistoryLadder,
  type TierHistoryData,
} from "./rating-history";
import { muFromOvr } from "./football-ovr";
import { muFromLevel } from "./level";
import type { Sport } from "./sport";
import type { TierBand } from "./tier-bands";

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

const VIEWER = "viewer";
const GROUP = { id: "group", name: "Thursday Football" };

const MU_OVR_71 = muFromOvr(71);
const MU_OVR_68 = muFromOvr(68);

function item(value: RatingHistoryItemData): RatingHistoryItemData {
  return value;
}

const LEVEL_MATCH = item({
  kind: "level_match",
  id: "level-match",
  at: THU_12_NOV,
  sport: "football",
  muBefore: MU_OVR_68,
  muAfter: MU_OVR_71,
  venueName: "Galali",
  sets: [{ own: 5, opponent: 3 }],
  football: { ratingHundredths: 780, goals: 1, mvp: false },
});

const CALIBRATION = item({
  kind: "level_override",
  id: "calibration",
  at: THU_29_OCT,
  sport: "football",
  muBefore: MU_OVR_68,
  muAfter: MU_OVR_71,
  setByRole: "verifier",
  setBy: { userId: "yaser", name: "Coach Yaser" },
  venueName: "Fantasy FC",
  reason: "plays_above_results",
  note: "Assessed over two sessions, plays above 68.",
});

const TIER_ADJUSTMENT = item({
  kind: "tier_adjustment",
  id: "tier-adjustment",
  at: THU_12_NOV,
  delta: -59,
  pointsBefore: 1260,
  pointsAfter: 1201,
  setBy: { userId: "hussain", name: "Hussain A" },
  reason: "back_from_injury",
  note: "Back from two months out, start him lower and let him climb.",
  group: GROUP,
  band: "kanaad",
});

describe("ratingHistoryLine", () => {
  it("reads a football Rated Match with the parts that fed it", () => {
    expect(ratingHistoryLine(LEVEL_MATCH, VIEWER, "en")).toMatchObject({
      icon: { kind: "level" },
      title: "Level, verified match",
      detail: "Won 5–3, Galali. Result, ratings 7.8, 1 goal",
      byline: null,
      delta: "+3",
      after: "71",
    });
  });

  it("reads a padel Rated Match by its Sets and two decimals", () => {
    const line = ratingHistoryLine(
      item({
        kind: "level_match",
        id: "padel",
        at: THU_12_NOV,
        sport: "padel",
        muBefore: muFromLevel(3.45),
        muAfter: muFromLevel(3.3),
        venueName: null,
        sets: [
          { own: 4, opponent: 6 },
          { own: 3, opponent: 6 },
        ],
        football: null,
      }),
      VIEWER,
      "en",
    );
    expect(line).toMatchObject({
      detail: "Lost 4–6, 3–6",
      delta: "−0.15",
      after: "3.30",
    });
  });

  it("names the Verifier and their Venue on a calibration", () => {
    expect(ratingHistoryLine(CALIBRATION, VIEWER, "en")).toMatchObject({
      icon: { kind: "override" },
      title: "Level calibrated by a verifier",
      detail: "Football, 68 to 71",
      byline:
        "Coach Yaser (Fantasy FC), Playing above this: “Assessed over two sessions, plays above 68.”",
      delta: "+3",
      after: "71",
    });
  });

  it("reads an Operator's and a Level setter's override by their door, and an old one with no reason", () => {
    const operator = ratingHistoryLine(
      item({
        ...CALIBRATION,
        setByRole: "operator",
        venueName: null,
        reason: null,
        note: null,
      } as RatingHistoryItemData),
      VIEWER,
      "en",
    );
    expect(operator).toMatchObject({
      title: "Level set by an operator",
      byline: "Coach Yaser, No reason given",
    });
    expect(
      ratingHistoryLine(
        item({
          ...CALIBRATION,
          setByRole: "level_setter",
        } as RatingHistoryItemData),
        VIEWER,
        "en",
      ).title,
    ).toBe("Level set by a level setter");
  });

  it("reads an Organizer's Tier adjustment with who, why and the note", () => {
    expect(ratingHistoryLine(TIER_ADJUSTMENT, VIEWER, "en")).toMatchObject({
      icon: { kind: "tier", band: "kanaad", label: "Kanaad" },
      title: "Tier points set by an organizer",
      detail: "Thursday Football, 1,260 to 1,201",
      byline:
        "Hussain A, Back from a break: “Back from two months out, start him lower and let him climb.”",
      delta: "−59",
      after: "1,201",
    });
  });

  it("reads a tier Game and a change of fish", () => {
    const tierGame = item({
      ...(game({
        delta: 18,
        pointsAfter: 1219,
        ratingHundredths: 740,
      }) as Extract<RatingHistoryEntryData, { kind: "tier_game" }>),
      group: GROUP,
      band: "kanaad",
    });
    expect(ratingHistoryLine(tierGame, VIEWER, "en")).toMatchObject({
      title: "Tier points, Thursday Football",
      detail: "Won 5–3, rated 7.4",
      delta: "+18",
      after: "1,219",
    });

    const band = (bandBefore: TierBand | null, bandAfter: TierBand | null) =>
      ratingHistoryLine(
        item({
          kind: "tier_band",
          id: "band",
          at: THU_29_OCT,
          group: { id: "friday", name: "Karbabad Friday Football" },
          bandBefore,
          bandAfter,
          place: 3,
          rankedCount: 22,
          points: 1318,
        }),
        VIEWER,
        "en",
      );
    expect(band("kanaad", "hamour")).toMatchObject({
      title: "Up to Hamour",
      detail: "Karbabad Friday Football, now #3 of 22",
      delta: "tier",
      after: "1,318",
    });
    expect(band("hamour", "kanaad").title).toBe("Down to Kanaad");
    expect(band(null, "safi").title).toBe("Now a Safi");
    expect(band("safi", null).title).toBe("No longer a Safi");
  });

  it("speaks the whole line and has Arabic copy", () => {
    expect(ratingHistoryLine(CALIBRATION, VIEWER, "en").spoken).toBe(
      "Level calibrated by a verifier. Football, 68 to 71. Coach Yaser (Fantasy FC), Playing above this: “Assessed over two sessions, plays above 68.”. +3, now 71",
    );
    const ar = ratingHistoryLine(CALIBRATION, VIEWER, "ar");
    expect(ar.title).toBe("معايرة المستوى من مُوثِّق");
    expect(ar.byline).toContain("Coach Yaser (Fantasy FC)");
    expect(ratingHistoryLine(TIER_ADJUSTMENT, VIEWER, "ar").title).toBe(
      "تحديد نقاط الفئة من منظّم",
    );
  });
});

describe("ratingHistoryScreen", () => {
  const NOW = new Date("2026-11-13T09:00:00Z");

  it("groups lines under This week, then each month, the year named once it changes", () => {
    const screen = ratingHistoryScreen(
      {
        ladder: "all",
        items: [
          LEVEL_MATCH,
          TIER_ADJUSTMENT,
          { ...CALIBRATION, id: "early-november", at: THU_5_NOV },
          CALIBRATION,
          {
            ...CALIBRATION,
            id: "last-year",
            at: new Date("2025-12-20T09:00:00Z"),
          },
        ],
        viewerUserId: VIEWER,
        now: NOW,
      },
      "en",
    );
    expect(
      screen.sections.map((section) => [
        section.title,
        section.lines.map((line) => line.key),
      ]),
    ).toEqual([
      ["This week", ["level-match", "tier-adjustment"]],
      ["November", ["early-november"]],
      ["October", ["calibration"]],
      ["December 2025", ["last-year"]],
    ]);
    expect(screen.empty).toBeNull();
    expect(screen.filters.map((filter) => filter.label)).toEqual([
      "All",
      "Level",
      "Tier",
      "Rank",
    ]);
    expect(screen.footnote).toBe(
      "Anything a person changed by hand carries their name and reason, and you see it the moment it happens.",
    );
  });

  it("keeps the Rank filter empty and reserved", () => {
    const screen = ratingHistoryScreen(
      { ladder: "rank", items: [LEVEL_MATCH], viewerUserId: VIEWER, now: NOW },
      "en",
    );
    expect(screen.sections).toEqual([]);
    expect(screen.empty).toEqual({
      text: "Coming with official tournaments",
      reserved: true,
    });
  });

  it("says why a filter is empty, padel's tier included", () => {
    const empty = (ladder: RatingHistoryLadder, sport?: Sport) =>
      ratingHistoryScreen(
        { ladder, sport, items: [], viewerUserId: VIEWER, now: NOW },
        "en",
      ).empty;
    expect(empty("all")).toEqual({
      text: "Nothing has moved your ratings yet.",
      reserved: false,
    });
    expect(empty("tier", "football")?.text).toBe(
      "No tier points have moved yet. They move after each game in a football group.",
    );
    expect(empty("tier", "padel")?.text).toBe(
      "Padel has no group tier. Padel groups keep their standings.",
    );
  });
});
