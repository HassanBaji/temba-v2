import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  arrowDelta,
  compactDelta,
  curvePoints,
  footballLevelWord,
  footballTabView,
  headerLine,
  heroView,
  lastTenRecord,
  lastTenSlots,
  partnerRows,
  recentRows,
  signedDelta,
  sportChips,
  tilesView,
  type FootballProfile,
  type MyProfile,
} from "./profile-model";

const NOW = new Date("2026-11-04T12:00:00Z");

function profile(overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    sport: "padel",
    group: null,
    level: {
      level: "3.2",
      rating: 3.21,
      levelBand: "C2",
      provisional: false,
      ratedMatchesRemaining: 0,
      progressPercent: 42,
      nextBand: "C1",
      distanceToNext: 0.29,
      winsToNext: 3,
      weekDelta: 0.12,
      history: [
        { level: 2.62, at: null },
        { level: 2.9, at: new Date("2026-03-10T10:00:00Z") },
        { level: 3.21, at: new Date("2026-11-02T10:00:00Z") },
      ],
      lastOverrideAt: null,
    },
    ratedMatchCount: 24,
    stats: {
      played: 24,
      won: 14,
      lost: 10,
      drawn: 0,
      winRatePercent: 58,
      run: { outcome: "won", count: 3 },
      sets: { won: 31, lost: 22 },
      longestStreak: { count: 5, reachedAt: new Date("2026-08-14T10:00:00Z") },
    },
    lastTen: [],
    football: null,
    partners: [],
    recent: [],
    hideRoasts: false,
    ...overrides,
  };
}

describe("deltas", () => {
  it("signs with a typographic minus and drops the sign at zero", () => {
    assert.equal(signedDelta(0.12), "+0.12");
    assert.equal(signedDelta(-0.26), "−0.26");
    assert.equal(signedDelta(0.001), "0.00");
    assert.equal(compactDelta(0.04), "+.04");
    assert.equal(arrowDelta(-0.12), "▼ 0.12");
  });
});

describe("headerLine", () => {
  it("puts the home area before the member line", () => {
    assert.equal(
      headerLine(
        { homeArea: "Seef", createdAt: new Date("2026-03-02T10:00:00Z") },
        "en",
      ),
      "Seef · Member since Mar 2026",
    );
  });

  it("reads the member line alone without an area", () => {
    assert.equal(
      headerLine({ homeArea: null, createdAt: NOW }, "en"),
      "Member since Nov 2026",
    );
  });
});

describe("sportChips", () => {
  it("offers the sport that is not set up", () => {
    assert.deepEqual(sportChips(["padel"]), {
      setUp: ["padel"],
      addable: ["football"],
    });
  });
});

describe("heroView", () => {
  it("reads a confirmed General Level", () => {
    const view = heroView(profile(), "en");
    assert.equal(view.kind, "rated");
    if (view.kind !== "rated") return;
    assert.equal(view.band, "C");
    assert.equal(view.rating, "3.21");
    assert.equal(view.status, "Confirmed · 24 rated");
    assert.equal(view.ring.label, "42% through");
    assert.equal(view.movement, "▲ 0.12 this week");
    assert.match(view.outlook, /^0\.29 to C\+\. 3 more wins/);
    assert.equal(view.curve.span, "Mar to Nov");
    assert.deepEqual(
      view.stats.map((stat) => stat.value),
      ["58%", "24", "W3"],
    );
  });

  it("reads a padel Level below 1.0 as 1.00", () => {
    const base = profile();
    const view = heroView(
      profile({ level: { ...base.level!, rating: 0.35, levelBand: "D3" } }),
      "en",
    );
    if (view.kind !== "rated") throw new Error("Expected a rated Level");
    assert.equal(view.rating, "1.00");
    assert.equal(view.band, "D");
  });

  it("counts toward confirming while Provisional", () => {
    const base = profile();
    const view = heroView(
      profile({
        ratedMatchCount: 3,
        level: { ...base.level!, provisional: true, ratedMatchesRemaining: 3 },
        stats: { ...base.stats, winRatePercent: null, played: 3 },
      }),
      "en",
    );
    if (view.kind !== "rated") throw new Error("expected rated");
    assert.equal(view.ring.label, "3 of 6 to confirm");
    assert.equal(view.ring.percent, 50);
    assert.match(view.outlook, /about 3 more rated matches/);
    assert.equal(view.stats[0]?.label, "win rate after 5");
  });

  it("has no ring without a Level", () => {
    const view = heroView(profile({ level: null }), "en");
    assert.equal(view.kind, "none");
  });
});

describe("lastTenSlots", () => {
  it("puts the oldest first and pads the old end with not played", () => {
    const slots = lastTenSlots(
      [
        { matchId: "m2", outcome: "won", delta: 0.04 },
        { matchId: "m1", outcome: "lost", delta: -0.03 },
      ],
      "en",
    );
    assert.equal(slots.length, 10);
    assert.equal(slots[0]?.variant, "not-played");
    assert.equal(slots[8]?.variant, "lost");
    assert.equal(slots[8]?.delta, "−.03");
    assert.equal(slots[9]?.variant, "won");
  });

  it("counts the record with draws only when there are some", () => {
    assert.equal(
      lastTenRecord([{ outcome: "won" }, { outcome: "lost" }], "en"),
      "1 won, 1 lost",
    );
    assert.equal(
      lastTenRecord([{ outcome: "won" }, { outcome: "draw" }], "en"),
      "1 won, 0 lost, 1 drawn",
    );
  });
});

describe("tilesView", () => {
  it("shows sets with their share and the longest streak's month", () => {
    const tiles = tilesView(profile().stats, "en");
    assert.equal(tiles.sets.value, "31–22");
    assert.equal(tiles.sets.sub, "58% of sets won");
    assert.equal(tiles.streak.value, "5 wins");
    assert.equal(tiles.streak.sub, "August 2026");
  });
});

describe("partnerRows and recentRows", () => {
  it("reads a padel record and a football one with draws", () => {
    const partner = {
      userId: "u1",
      name: "Mohammed K",
      image: null,
      won: 6,
      lost: 3,
      played: 9,
    };
    assert.equal(partnerRows([partner], "padel", "en")[0]?.record, "6–3");
    assert.equal(partnerRows([partner], "padel", "en")[0]?.percent, 67);
    assert.equal(
      partnerRows([{ ...partner, played: 10 }], "football", "en")[0]?.record,
      "6–1–3",
    );
  });

  it("writes partners, opponents and sets from the owner's side", () => {
    const [row] = recentRows(
      [
        {
          matchId: "m1",
          gameId: "g1",
          playedAt: new Date("2026-11-03T16:00:00Z"),
          outcome: "won",
          partners: ["Mohammed K"],
          opponents: ["Ali R", "Omar S"],
          sets: [
            { us: 6, them: 4 },
            { us: 6, them: 3 },
          ],
          delta: 0.04,
          groupName: "Tuesday Crew",
          format: "doubles",
          canOpenGame: true,
        },
      ] as MyProfile["recent"],
      "en",
    );
    assert.equal(row?.title, "with Mohammed K vs Ali R & Omar S");
    assert.equal(row?.sub, "Tue 3 Nov, Tuesday Crew");
    assert.equal(row?.score, "6–4  6–3");
    assert.equal(row?.delta, "+0.04");
  });
});

describe("curvePoints", () => {
  it("runs right to left when mirrored for RTL", () => {
    const points = curvePoints([1, 2], 100, 50, { mirrored: true });
    assert.equal(points[0]?.x, 100);
    assert.equal(points[1]?.x, 0);
  });
});

describe("football", () => {
  it("reads a placement band as its word", () => {
    assert.equal(footballLevelWord("C1", "en"), "Competitive");
    assert.equal(footballLevelWord("B2", "en"), "B");
  });

  it("builds the tab from the football profile", () => {
    const football = {
      player: { id: "u1", name: "Hassan Haji", image: null, isViewer: true },
      historyHidden: false,
      sports: ["football"],
      venue: null,
      rating: {
        level: "3.9",
        levelBand: "C1",
        provisional: true,
        ratedMatchCount: 0,
        ratedMatchesRemaining: 5,
        levelValue: 3.85,
      },
      role: { role: "outfield", position: null },
      overall: { played: 11, won: 6, lost: 3, drawn: 2, goals: 7 },
      streaks: { current: 3, best: 3, bestReachedAt: null },
      lastMatches: [
        { matchId: "m2", outcome: "won", goals: 2 },
        { matchId: "m1", outcome: "draw", goals: 0 },
      ],
    } as unknown as FootballProfile;
    const view = footballTabView(football, "en");
    assert.equal(view.level?.placement, "Competitive");
    assert.equal(view.level?.status, "Self-placed");
    assert.equal(view.level?.ovr, "72");
    assert.equal(view.level?.band, "C+");
    assert.equal(view.goals.total, "2 goals");
    assert.equal(view.goals.bars.length, 10);
    assert.equal(view.goals.bars[9]?.goals, 2);
    assert.equal(view.stats[2]?.value, "0.64");
    assert.equal(view.lastTenRecord, "1 won, 0 lost, 1 drawn");
    assert.equal(view.allTime.bestRun, "Best run 3");
  });
});
