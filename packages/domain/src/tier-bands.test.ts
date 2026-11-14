import { describe, expect, it } from "vitest";

import {
  TIER_MIN_RANKED,
  tierAdjustPreview,
  tierBandCounts,
  tierBandLabel,
  tierHintReference,
  tierIsProvisional,
  tierTable,
  type TierStanding,
} from "./tier-bands";

function member(
  userId: string,
  points: number,
  extra: Partial<TierStanding> = {},
): TierStanding {
  return {
    userId,
    points,
    gamesCounted: 10,
    adjusted: false,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...extra,
  };
}

/** The Members design's Group: eleven ranked members and two still Provisional. */
const THURSDAY: TierStanding[] = [
  member("hussain", 1412),
  member("ali", 1356),
  member("yousif", 1301),
  member("mahmood", 1248),
  member("jassim", 1214),
  member("you", 1201),
  member("salman", 1187),
  member("ahmed", 1160),
  member("bo", 1122),
  member("noor", 1098),
  member("omar", 1064),
  member("khalid", 1200, { gamesCounted: 3 }),
  member("majed", 1200, { gamesCounted: 1 }),
];

describe("tierIsProvisional", () => {
  it("lasts five games or until an adjustment", () => {
    expect(tierIsProvisional({ gamesCounted: 4, adjusted: false })).toBe(true);
    expect(tierIsProvisional({ gamesCounted: 5, adjusted: false })).toBe(false);
    expect(tierIsProvisional({ gamesCounted: 0, adjusted: true })).toBe(false);
  });
});

describe("tierBandCounts", () => {
  it("gives eleven ranked members 1 Shark, 2 Hamour, 4 Kanaad, 4 Safi", () => {
    expect(tierBandCounts(11)).toEqual({
      shark: 1,
      hamour: 2,
      kanaad: 4,
      safi: 4,
    });
  });

  it("gives no fish below two ranked members", () => {
    expect(tierBandCounts(1)).toEqual({
      shark: 0,
      hamour: 0,
      kanaad: 0,
      safi: 0,
    });
  });

  it("places everyone exactly once with one Shark from 2 to 30 ranked", () => {
    for (let ranked = TIER_MIN_RANKED; ranked <= 30; ranked += 1) {
      const counts = tierBandCounts(ranked);
      const rest = ranked - 1;
      expect(counts.shark, `${ranked}`).toBe(1);
      expect(counts.hamour, `${ranked}`).toBe(Math.round(0.15 * rest));
      expect(counts.kanaad, `${ranked}`).toBe(Math.round(0.35 * rest));
      expect(counts.safi, `${ranked}`).toBeGreaterThanOrEqual(0);
      expect(
        counts.shark + counts.hamour + counts.kanaad + counts.safi,
        `${ranked}`,
      ).toBe(ranked);
      expect(counts.safi, `${ranked}`).toBeGreaterThanOrEqual(counts.hamour);
    }
  });
});

describe("tierTable", () => {
  it("reads screen 2b", () => {
    const table = tierTable(THURSDAY);
    expect(table.rankedCount).toBe(11);
    expect(table.provisionalCount).toBe(2);
    expect(table.showsBands).toBe(true);
    expect(table.rows.map((row) => [row.userId, row.place, row.band])).toEqual([
      ["hussain", 1, "shark"],
      ["ali", 2, "hamour"],
      ["yousif", 3, "hamour"],
      ["mahmood", 4, "kanaad"],
      ["jassim", 5, "kanaad"],
      ["you", 6, "kanaad"],
      ["salman", 7, "kanaad"],
      ["ahmed", 8, "safi"],
      ["bo", 9, "safi"],
      ["noor", 10, "safi"],
      ["omar", 11, "safi"],
      ["khalid", null, null],
      ["majed", null, null],
    ]);
    const khalid = table.rows.find((row) => row.userId === "khalid");
    expect(khalid).toMatchObject({ provisional: true, gamesOfFive: 3 });
  });

  it("counts the points to the next band up, 53 to Hamour on screen 2e", () => {
    const rows = new Map(
      tierTable(THURSDAY).rows.map((row) => [row.userId, row]),
    );
    expect(rows.get("mahmood")).toMatchObject({
      nextBand: "hamour",
      pointsToNextBand: 53,
    });
    expect(rows.get("hussain")).toMatchObject({
      nextBand: null,
      pointsToNextBand: null,
    });
    expect(rows.get("ali")).toMatchObject({
      nextBand: "shark",
      pointsToNextBand: 56,
    });
  });

  it("leaves Provisional members out when places are cut", () => {
    const table = tierTable([
      member("a", 1300),
      member("b", 1250),
      member("c", 1220),
      member("d", 1210),
      member("newcomer", 2000, { gamesCounted: 2 }),
    ]);
    expect(table.rankedCount).toBe(4);
    expect(table.rows[0]).toMatchObject({ userId: "a", band: "shark" });
    expect(table.rows.at(-1)).toMatchObject({
      userId: "newcomer",
      place: null,
      band: null,
    });
  });

  it("shows a place and no fish with one ranked member", () => {
    const table = tierTable([
      member("a", 1300),
      member("b", 1210, { gamesCounted: 4 }),
    ]);
    expect(table.showsBands).toBe(false);
    expect(table.rows.map((row) => [row.place, row.band])).toEqual([
      [1, null],
      [null, null],
    ]);
  });

  it("gives a Shark and a Safi with two ranked, and a Kanaad between with three", () => {
    const two = tierTable([member("a", 1300), member("b", 1250)]);
    expect(two.showsBands).toBe(true);
    expect(two.rows.map((row) => row.band)).toEqual(["shark", "safi"]);
    const three = tierTable([
      member("a", 1300),
      member("b", 1250),
      member("c", 1220),
    ]);
    expect(three.rows.map((row) => row.band)).toEqual([
      "shark",
      "kanaad",
      "safi",
    ]);
  });

  it("breaks a tie on points by games counted, then by who joined first", () => {
    const table = tierTable([
      member("late", 1200, { joinedAt: new Date("2026-03-01T00:00:00Z") }),
      member("early", 1200, { joinedAt: new Date("2026-02-01T00:00:00Z") }),
      member("busy", 1200, { gamesCounted: 20 }),
    ]);
    expect(table.rows.map((row) => row.userId)).toEqual([
      "busy",
      "early",
      "late",
    ]);
  });

  it("ranks an adjusted member before their fifth game", () => {
    const table = tierTable([
      member("set", 1180, { gamesCounted: 0, adjusted: true }),
    ]);
    expect(table.rows[0]).toMatchObject({ provisional: false, place: 1 });
  });
});

describe("tierAdjustPreview", () => {
  it("returns the new place and band and who moves the other way", () => {
    const table = tierTable(THURSDAY);
    const preview = tierAdjustPreview(table, "mahmood", 1320);
    expect(preview).toMatchObject({
      place: 3,
      band: "hamour",
      rankedCount: 11,
    });
    expect(preview.others).toEqual([
      { userId: "yousif", from: "hamour", to: "kanaad" },
    ]);
  });

  it("ranks a Provisional member it adjusts", () => {
    const table = tierTable(THURSDAY);
    const preview = tierAdjustPreview(table, "khalid", 1500);
    expect(preview).toMatchObject({ place: 1, band: "shark", rankedCount: 12 });
    expect(preview.others).toContainEqual({
      userId: "hussain",
      from: "shark",
      to: "hamour",
    });
  });
});

describe("tierBandLabel", () => {
  it("names the fish in both languages", () => {
    expect(tierBandLabel("kanaad", "en")).toBe("Kanaad");
    expect(tierBandLabel("shark", "ar")).toBe("قرش");
  });
});

describe("tierHintReference", () => {
  const ranked = (points: number, ovr: number | null) => ({
    points,
    provisional: false,
    ovr,
  });
  const provisional = (ovr: number | null) => ({
    points: 1200,
    provisional: true,
    ovr,
  });

  it("reads the ranked members' median points, median OVR and range", () => {
    expect(
      tierHintReference([
        ranked(1412, 80),
        ranked(1301, 70),
        ranked(1248, null),
        ranked(1160, 60),
        ranked(1064, 50),
        provisional(99),
      ]),
    ).toEqual({
      medianPoints: 1248,
      medianOvr: 65,
      minPoints: 1064,
      maxPoints: 1412,
    });
  });

  it("starts from 1,200 and one adjustment either way below four ranked", () => {
    expect(
      tierHintReference([
        ranked(1230, 70),
        provisional(60),
        provisional(50),
        provisional(null),
      ]),
    ).toEqual({
      medianPoints: 1200,
      medianOvr: 60,
      minPoints: 800,
      maxPoints: 1600,
    });
  });

  it("is null when nobody has an OVR", () => {
    expect(tierHintReference([provisional(null)])).toBeNull();
    expect(tierHintReference([])).toBeNull();
  });
});
