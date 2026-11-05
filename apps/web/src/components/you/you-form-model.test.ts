import { describe, expect, it } from "vitest";

import {
  formRecord,
  lastTenSlots,
  partnerRows,
  profileTiles,
  recentRows,
} from "./you-form-model";
import type { MyProfile } from "./you-hero-model";

describe("lastTenSlots", () => {
  it("pads the older side and ends on the latest Match", () => {
    const slots = lastTenSlots(
      [
        { matchId: "new", outcome: "won", delta: 0.04 },
        { matchId: "old", outcome: "lost", delta: -0.03 },
      ],
      "en",
    );
    expect(slots).toHaveLength(10);
    expect(slots.slice(0, 8).every((slot) => slot.kind === "empty")).toBe(true);
    expect(slots[8]).toMatchObject({
      key: "old",
      mark: "L",
      delta: "−.03",
      spoken: "Lost −.03",
    });
    expect(slots[9]).toMatchObject({ key: "new", mark: "W", delta: "+.04" });
  });

  it("keeps only the ten newest", () => {
    const matches = Array.from({ length: 12 }, (_, index) => ({
      matchId: `m${index}`,
      outcome: "draw" as const,
    }));
    const slots = lastTenSlots(matches, "en");
    expect(slots.map((slot) => slot.key)).toEqual([
      "m9",
      "m8",
      "m7",
      "m6",
      "m5",
      "m4",
      "m3",
      "m2",
      "m1",
      "m0",
    ]);
    expect(slots[0]).toMatchObject({ mark: "D", delta: null, spoken: "Drawn" });
  });
});

describe("formRecord", () => {
  it("adds draws only when there are some", () => {
    expect(formRecord([{ outcome: "won" }, { outcome: "lost" }], "en")).toBe(
      "1 won, 1 lost",
    );
    expect(formRecord([{ outcome: "won" }, { outcome: "draw" }], "en")).toBe(
      "1 won, 0 lost, 1 drawn",
    );
  });
});

const baseStats: MyProfile["stats"] = {
  played: 24,
  won: 14,
  lost: 10,
  drawn: 0,
  winRatePercent: 58,
  run: null,
  sets: { won: 31, lost: 22 },
  longestStreak: { count: 5, reachedAt: new Date("2026-08-14T10:00:00Z") },
};

describe("profileTiles", () => {
  it("shows sets won and the longest streak's month", () => {
    expect(profileTiles(baseStats, "en")).toEqual([
      { label: "Sets", value: "31–22", sub: "58% of sets won" },
      { label: "Longest streak", value: "5 wins", sub: "August 2026" },
    ]);
  });

  it("says none yet before a win", () => {
    const [sets, streak] = profileTiles(
      { ...baseStats, sets: { won: 0, lost: 0 }, longestStreak: null },
      "en",
    );
    expect(sets.sub).toBeNull();
    expect(streak).toEqual({
      label: "Longest streak",
      value: "None yet",
      sub: null,
    });
  });
});

describe("partnerRows", () => {
  it("reads each partner's record and win share", () => {
    const [row] = partnerRows(
      [
        {
          userId: "u1",
          name: "Mohammed K",
          image: null,
          won: 6,
          lost: 3,
          played: 9,
        },
      ],
      "en",
    );
    expect(row).toMatchObject({
      initials: "MK",
      record: "6–3",
      percent: 67,
      spoken: "Mohammed K, 6 won, 3 lost, 67%",
    });
  });
});

describe("recentRows", () => {
  const match: MyProfile["recent"][number] = {
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
    format: "friendly_game",
    canOpenGame: true,
  };

  it("names partners, opponents, day and Group", () => {
    expect(recentRows([match], "en")[0]).toEqual({
      matchId: "m1",
      outcome: "won",
      title: "with Mohammed K vs Ali R & Omar S",
      sub: "Tue 3 Nov, Tuesday Crew",
      score: "6–4  6–3",
      delta: "+0.04",
      href: "/dashboard/games/g1",
    });
  });

  it("reads a Match outside a Group as a Friendly with no link when closed", () => {
    const [row] = recentRows(
      [
        {
          ...match,
          partners: [],
          groupName: null,
          canOpenGame: false,
          delta: null,
        },
      ],
      "en",
    );
    expect(row?.title).toBe("vs Ali R & Omar S");
    expect(row?.sub).toBe("Tue 3 Nov, Friendly");
    expect(row?.href).toBeNull();
    expect(row?.delta).toBeNull();
  });
});
