import { describe, expect, it } from "vitest";

import { isolate } from "@repo/i18n/bidi";

import { levelFromOvr, muFromOvr } from "./football-ovr";
import {
  inYourGroupsRows,
  ratingsLevelView,
  ratingsScreenView,
  ratingsTierRows,
  sportSwitchLevel,
  type GroupStandingData,
  type MyGroupTierData,
  type RatingsLevelData,
} from "./ratings-screen";

function row(overrides: Partial<GroupStandingData> = {}): GroupStandingData {
  return {
    groupId: "g1",
    name: "Tuesday Night Padel",
    seasonId: "s1",
    position: 3,
    memberCount: 12,
    won: 14,
    drawn: 0,
    lost: 8,
    ...overrides,
  };
}

describe("inYourGroupsRows", () => {
  it("reads won, lost and place for the Season, as screen 1b", () => {
    expect(inYourGroupsRows([row()], "en")).toEqual([
      {
        groupId: "g1",
        name: "Tuesday Night Padel",
        initials: "TP",
        record: "14 won, 8 lost this season",
        place: "#3 of 12",
        ranked: true,
        spoken: "Tuesday Night Padel, #3 of 12, 14 won, 8 lost this season",
      },
    ]);
  });

  it("names draws only when there are some", () => {
    expect(inYourGroupsRows([row({ drawn: 2 })], "en")[0]?.record).toBe(
      "14 won, 2 drawn, 8 lost this season",
    );
  });

  it("reads all-time for a Group with no Season, and Unranked before a result", () => {
    const [view] = inYourGroupsRows(
      [row({ seasonId: null, position: null, won: 0, lost: 0 })],
      "en",
    );
    expect(view?.record).toBe("0 won, 0 lost");
    expect(view?.place).toBe("Unranked");
    expect(view?.ranked).toBe(false);
  });

  it("reads in Arabic", () => {
    const [view] = inYourGroupsRows([row()], "ar");
    expect(view?.record).toBe("14 فوز، 8 خسارة هذا الموسم");
    expect(view?.place).toBe("#3 من 12");
  });
});

function footballLevel(
  overrides: Partial<RatingsLevelData> = {},
): RatingsLevelData {
  return {
    face: "ovr",
    levelValue: levelFromOvr(74),
    rating: { levelBand: "C1", provisional: false, ratedMatchesRemaining: 0 },
    ratedMatchCount: 12,
    changeOverLast: { matches: 8, delta: 2.2, points: [72, 72.6, 74.2] },
    ...overrides,
  };
}

function padelLevel(
  overrides: Partial<RatingsLevelData> = {},
): RatingsLevelData {
  return {
    face: "level",
    levelValue: 3.45,
    rating: { levelBand: "C2", provisional: false, ratedMatchesRemaining: 0 },
    ratedMatchCount: 9,
    changeOverLast: { matches: 3, delta: -0.15, points: [3.6, 3.45] },
    ...overrides,
  };
}

function tier(overrides: Partial<MyGroupTierData> = {}): MyGroupTierData {
  return {
    groupId: "t1",
    name: "Thursday Football",
    memberCount: 13,
    band: "kanaad",
    place: 6,
    points: 1201,
    provisional: false,
    gamesOfFive: 5,
    ...overrides,
  };
}

describe("ratingsLevelView", () => {
  it("reads a confirmed football Level as the number alone, on the 40 to 99 scale", () => {
    const view = ratingsLevelView(
      footballLevel({
        lastMatch: {
          outcome: "won",
          sets: [{ own: 5, opponent: 3 }],
          muBefore: muFromOvr(73),
          muAfter: muFromOvr(74),
        },
      }),
      "football",
      "en",
    );
    expect(view).toMatchObject({
      kind: "rated",
      title: "Temba Level",
      status: "Confirmed",
      band: null,
      numberLabel: "Level",
      number: "74",
      ringPercent: 57.6,
      scale: { percent: 57.6, ticks: ["40", "55", "70", "85", "99"] },
      change: { delta: "+2", caption: "last 8", points: [72, 72.6, 74.2] },
      start: null,
      footer: {
        label: "Last match",
        result: "Won 5–3",
        value: "+1",
        detail: null,
        pips: null,
      },
      note: "How good you are, on verified matches only. OVR runs 40 to 99 and never resets.",
    });
    if (view.kind !== "rated") throw new Error("Expected a rated Level");
    expect(view.spoken).toBe(
      "Temba Level 74. Confirmed. +2 over the last 8 matches. Last match Won 5–3 +1",
    );
  });

  it("names no football band, not even when spoken", () => {
    const view = ratingsLevelView(footballLevel(), "football", "en");
    if (view.kind !== "rated") throw new Error("Expected a rated Level");
    expect(view.band).toBeNull();
    expect(view.spoken).not.toMatch(/band|C\+/);
  });

  it("reads a football loss going down, and a confirmed Level with no Match yet", () => {
    const down = ratingsLevelView(
      footballLevel({
        lastMatch: {
          outcome: "lost",
          sets: [{ own: 2, opponent: 4 }],
          muBefore: muFromOvr(69),
          muAfter: muFromOvr(68),
        },
      }),
      "football",
      "en",
    );
    expect(down).toMatchObject({
      footer: { label: "Last match", result: "Lost 2–4", value: "−1" },
    });
    expect(
      ratingsLevelView(
        footballLevel({ lastMatch: null, changeOverLast: null }),
        "football",
        "en",
      ),
    ).toMatchObject({
      footer: { label: "Last match", result: "None yet", value: null },
    });
  });

  it("counts a Provisional football Level to confirm in five pips", () => {
    const view = ratingsLevelView(
      footballLevel({
        levelValue: levelFromOvr(63),
        rating: {
          levelBand: "C3",
          provisional: true,
          ratedMatchesRemaining: 2,
        },
        changeOverLast: { matches: 3, delta: 2, points: [61, 62, 62, 63] },
      }),
      "football",
      "en",
    );
    expect(view).toMatchObject({
      status: "Provisional",
      provisional: true,
      number: "63",
      scale: { percent: 39 },
      change: { delta: "+2", caption: "last 3" },
      footer: {
        label: "To confirm",
        value: "3 of 5 matches",
        pips: { done: 3, total: 5 },
      },
    });
  });

  it("says where a new football number came from before any Match", () => {
    const fresh = footballLevel({
      levelValue: levelFromOvr(61),
      rating: { levelBand: "C3", provisional: true, ratedMatchesRemaining: 5 },
      ratedMatchCount: 0,
      changeOverLast: null,
      historySteps: [],
    });
    expect(ratingsLevelView(fresh, "football", "en")).toMatchObject({
      number: "61",
      scale: { percent: 35.6 },
      change: null,
      start: "Starting level, from sign-up",
      footer: { value: "0 of 5 matches", pips: { done: 0, total: 5 } },
    });
    expect(
      ratingsLevelView({ ...fresh, historySteps: ["set"] }, "football", "en"),
    ).toMatchObject({ start: "Starting level" });
  });

  it("reads the football card in Arabic", () => {
    const view = ratingsLevelView(
      footballLevel({
        lastMatch: {
          outcome: "won",
          sets: [{ own: 5, opponent: 3 }],
          muBefore: muFromOvr(73),
          muAfter: muFromOvr(74),
        },
      }),
      "football",
      "ar",
    );
    expect(view).toMatchObject({
      footer: { label: "آخر مباراة", result: `فوز ${isolate("5–3")}` },
    });
  });

  it("reads padel to two decimals, with a two-decimal change", () => {
    const view = ratingsLevelView(
      {
        face: "level",
        levelValue: 3.45,
        rating: {
          levelBand: "C2",
          provisional: false,
          ratedMatchesRemaining: 0,
        },
        ratedMatchCount: 9,
        changeOverLast: { matches: 3, delta: -0.15, points: [3.6, 3.45] },
      },
      "padel",
      "en",
    );
    expect(view).toMatchObject({
      number: "3.45",
      band: "C",
      scale: null,
      start: null,
      change: { delta: "−0.15", caption: "last 3" },
      footer: { label: "Next band", result: null, pips: null },
    });
    if (view.kind !== "rated") throw new Error("Expected a rated Level");
    expect(view.footer.detail).toBe(`, ${view.ringPercent}% of the way`);
    expect(view.spoken).toContain("band C");
  });

  it("shows a Provisional padel Level as a hatched ring with the count to confirm", () => {
    const view = ratingsLevelView(
      padelLevel({
        rating: {
          levelBand: "C2",
          provisional: true,
          ratedMatchesRemaining: 3,
        },
        ratedMatchCount: 2,
      }),
      "padel",
      "en",
    );
    expect(view).toMatchObject({
      status: "Provisional",
      provisional: true,
      ringHatched: true,
      ringPercent: 40,
      footer: {
        label: "To confirm",
        value: "2 of 5 matches",
        detail: null,
        pips: null,
      },
    });
  });

  it("counts a padel Level towards five Matches in a Verified Group, not every rated one", () => {
    const view = ratingsLevelView(
      {
        face: "level",
        levelValue: 3.45,
        rating: {
          levelBand: "C2",
          provisional: true,
          ratedMatchesRemaining: 4,
        },
        ratedMatchCount: 6,
        changeOverLast: null,
      },
      "padel",
      "en",
    );
    expect(view).toMatchObject({
      provisional: true,
      ringHatched: true,
      ringPercent: 20,
      footer: { label: "To confirm", value: "1 of 5 matches", detail: null },
    });
  });

  it("reads the top padel band without a next one", () => {
    const view = ratingsLevelView(
      padelLevel({
        levelValue: 6.8,
        rating: {
          levelBand: "A",
          provisional: false,
          ratedMatchesRemaining: 0,
        },
      }),
      "padel",
      "en",
    );
    expect(view).toMatchObject({
      ringPercent: 100,
      footer: { label: "Top band", value: null, detail: null },
    });
  });

  it("has no number without a Level", () => {
    expect(
      ratingsLevelView(
        footballLevel({ rating: null, levelValue: null, changeOverLast: null }),
        "football",
        "en",
      ),
    ).toMatchObject({ kind: "none", message: "No level yet" });
  });
});

describe("ratingsTierRows", () => {
  it("reads a fish, a place without fish, and a Provisional slot", () => {
    const rows = ratingsTierRows(
      [
        tier(),
        tier({
          groupId: "t2",
          name: "Small",
          band: null,
          place: 2,
          memberCount: 5,
        }),
        tier({
          groupId: "t3",
          name: "Gooz of Arad",
          band: null,
          place: null,
          provisional: true,
          gamesOfFive: 2,
          points: 1200,
        }),
      ],
      "en",
    );
    expect(rows).toEqual([
      {
        groupId: "t1",
        name: "Thursday Football",
        cell: { kind: "fish", band: "kanaad", label: "Kanaad" },
        caption: "Kanaad, #6 of 13",
        points: "1,201",
        spoken: "Thursday Football, Kanaad, #6 of 13, 1,201 tier points",
      },
      {
        groupId: "t2",
        name: "Small",
        cell: { kind: "place", label: "#2" },
        caption: "#2 of 5",
        points: "1,201",
        spoken: "Small, #2 of 5, 1,201 tier points",
      },
      {
        groupId: "t3",
        name: "Gooz of Arad",
        cell: { kind: "provisional", label: "Provisional" },
        caption: "Provisional, 2 of 5 games",
        points: null,
        spoken: "Gooz of Arad, Provisional, 2 of 5 games",
      },
    ]);
  });
});

describe("ratingsScreenView", () => {
  const verified = row({
    groupId: "v1",
    name: "Verified Football",
    position: 2,
    memberCount: 10,
  });

  it("gives a football player in two tier Groups and one Verified Group two tier rows and the Verified Group under In your groups", () => {
    const view = ratingsScreenView(
      {
        sport: "football",
        level: footballLevel(),
        tiers: [tier(), tier({ groupId: "t2", name: "Friday Football" })],
        standings: [
          row({ groupId: "t1", name: "Thursday Football" }),
          row({ groupId: "t2", name: "Friday Football" }),
          verified,
        ],
      },
      "en",
    );
    expect(view.tier?.rows.map((entry) => entry.groupId)).toEqual(["t1", "t2"]);
    expect(view.tier?.meta).toBe("2 groups");
    expect(view.inYourGroups?.rows.map((entry) => entry.groupId)).toEqual([
      "v1",
    ]);
    expect(view.order).toEqual(["level", "tier", "groups", "official"]);
  });

  it("gives a padel player no tier section", () => {
    const view = ratingsScreenView(
      {
        sport: "padel",
        level: footballLevel({ face: "level" }),
        tiers: [tier()],
        standings: [row()],
      },
      "en",
    );
    expect(view.tier).toBeNull();
    expect(view.order).not.toContain("tier");
    expect(view.inYourGroups).toMatchObject({
      meta: "no tier in padel",
      rows: [expect.objectContaining({ groupId: "g1" })],
    });
  });

  it("reserves the Official Rank slot with no number", () => {
    const view = ratingsScreenView(
      {
        sport: "football",
        level: footballLevel(),
        tiers: [],
        standings: [],
      },
      "en",
    );
    expect(view.official).toEqual({
      title: "Official rank",
      message: "Coming with official tournaments",
      note: "What you’ve won, officially. Tournament and division results only; nobody can edit it.",
    });
    expect(Object.values(view.official).join(" ")).not.toMatch(/\d/);
    expect(view.tier).toBeNull();
    expect(view.inYourGroups).toBeNull();
  });

  it("reads in Arabic", () => {
    const view = ratingsScreenView(
      {
        sport: "football",
        level: footballLevel(),
        tiers: [tier()],
        standings: [],
      },
      "ar",
    );
    expect(view.tier?.title).toBe("فئة المجموعة");
    expect(view.official.message).toBe("قادمة مع البطولات الرسمية");
  });
});

describe("sportSwitchLevel", () => {
  it("shows the football OVR and the padel band", () => {
    expect(sportSwitchLevel("football", footballLevel(), "en")).toEqual({
      label: "74",
      spoken: "Football, level 74",
    });
    expect(sportSwitchLevel("padel", padelLevel(), "en")).toEqual({
      label: "C",
      spoken: "Padel, C",
    });
  });

  it("shows nothing before the first Rating", () => {
    expect(
      sportSwitchLevel(
        "football",
        footballLevel({ rating: null, levelValue: null }),
        "en",
      ),
    ).toBeNull();
    expect(sportSwitchLevel("padel", undefined, "en")).toBeNull();
  });
});
