import { describe, expect, it } from "vitest";

import {
  formatImprovementGain,
  mostImprovedColumns,
  mostImprovedSpoken,
  mostImprovedTable,
  standingByLevel,
  standingLadder,
  standingViewFooter,
  standingViewOptions,
  standingViewShown,
  type StandingLevelData,
} from "./standing-views";

function level(
  userId: string,
  values: Partial<Omit<StandingLevelData, "userId">> = {},
): StandingLevelData {
  return {
    userId,
    band: null,
    ovr: null,
    start: null,
    end: null,
    startBand: null,
    endBand: null,
    ...values,
  };
}

function row(
  userId: string,
  position: number | null,
  played = position === null ? 0 : 3,
) {
  return { userId, position, ranked: position !== null, played };
}

describe("standingLadder", () => {
  it("reads the Temba Level on a Verified Group and Tier points on a tier Group", () => {
    expect(standingLadder({ verified: true, hasTier: false })).toBe("level");
    expect(standingLadder({ verified: false, hasTier: true })).toBe("tier");
    expect(standingLadder({ verified: false, hasTier: false })).toBeNull();
  });
});

describe("standingViewOptions", () => {
  const season = { hasSeasons: true, seasonInView: true };

  it("offers all three views on a Verified Group", () => {
    expect(
      standingViewOptions({ verified: true, hasTier: false, ...season }, "en"),
    ).toEqual([
      { view: "overall", label: "Overall", enabled: true },
      { view: "by-level", label: "By level", enabled: true },
      { view: "most-improved", label: "Most improved", enabled: true },
    ]);
  });

  it("offers Overall and Most improved on a tier Group", () => {
    expect(
      standingViewOptions(
        { verified: false, hasTier: true, ...season },
        "en",
      ).map((option) => option.view),
    ).toEqual(["overall", "most-improved"]);
  });

  it("draws no row for a padel Group that is not Verified", () => {
    expect(
      standingViewOptions({ verified: false, hasTier: false, ...season }, "en"),
    ).toEqual([]);
  });

  it("switches Most improved off on All-time and drops it with no Season", () => {
    const allTime = standingViewOptions(
      { verified: true, hasTier: false, hasSeasons: true, seasonInView: false },
      "en",
    );
    expect(allTime.find((option) => option.view === "most-improved")).toEqual(
      expect.objectContaining({ enabled: false }),
    );
    expect(standingViewShown("most-improved", allTime)).toBe("overall");
    expect(standingViewShown("by-level", allTime)).toBe("by-level");

    expect(
      standingViewOptions(
        {
          verified: false,
          hasTier: true,
          hasSeasons: false,
          seasonInView: false,
        },
        "en",
      ),
    ).toEqual([]);
  });
});

describe("standingByLevel", () => {
  it("splits padel by band letter, highest first, each with its own 1st", () => {
    const rows = [
      row("ahmed", 1),
      row("hassan", 2),
      row("sara", 3),
      row("layla", 4),
      row("guest", 5),
      row("omar", null),
    ];
    const { sections, unranked } = standingByLevel(
      rows,
      [
        level("ahmed", { band: "B2" }),
        level("hassan", { band: "C1" }),
        level("sara", { band: "B3" }),
        level("layla", { band: "D1" }),
        level("omar", { band: "C3" }),
      ],
      "padel",
      "en",
    );
    expect(
      sections.map((section) => [
        section.title,
        section.countLabel,
        section.rows.map((entry) => [
          entry.userId,
          entry.position,
          entry.levelLabel,
        ]),
      ]),
    ).toEqual([
      [
        "Category B",
        "2 players",
        [
          ["ahmed", 1, "B"],
          ["sara", 2, "B-"],
        ],
      ],
      ["Category C", "1 player", [["hassan", 1, "C+"]]],
      ["Category D", "1 player", [["layla", 1, "D+"]]],
      ["No level yet", "1 player", [["guest", 1, null]]],
    ]);
    expect(unranked.map((entry) => [entry.userId, entry.levelLabel])).toEqual([
      ["omar", "C-"],
    ]);
  });

  it("splits football into OVR ranges of 15 from 40", () => {
    const { sections } = standingByLevel(
      [row("a", 1), row("b", 2), row("c", 3), row("d", 4)],
      [
        level("a", { ovr: 78 }),
        level("b", { ovr: 61 }),
        level("c", { ovr: 99 }),
        level("d", { ovr: 40 }),
      ],
      "football",
      "en",
    );
    expect(
      sections.map((section) => [
        section.title,
        section.rows.map((entry) => entry.levelLabel),
      ]),
    ).toEqual([
      ["Level 85 to 99", ["99"]],
      ["Level 70 to 84", ["78"]],
      ["Level 55 to 69", ["61"]],
      ["Level 40 to 54", ["40"]],
    ]);
  });
});

describe("mostImprovedTable", () => {
  it("ranks padel gains, then lists flat or down, then those short of games", () => {
    const rows = [
      row("ahmed", 1, 8),
      row("hassan", 2, 8),
      row("mariam", 3, 8),
      row("noor", 4, 3),
      row("omar", null, 0),
      row("guest", 5, 2),
    ];
    const table = mostImprovedTable(
      rows,
      [
        level("ahmed", {
          start: 405,
          end: 410,
          startBand: "B2",
          endBand: "B2",
        }),
        level("hassan", {
          start: 330,
          end: 345,
          startBand: "C1",
          endBand: "C1",
        }),
        level("mariam", {
          start: 325,
          end: 320,
          startBand: "C2",
          endBand: "C2",
        }),
        level("noor", { start: 345, end: 375, startBand: "C1", endBand: "B3" }),
        level("omar", { start: 275, end: 280, startBand: "C3", endBand: "C3" }),
      ],
      "level",
      "padel",
      "en",
    );
    expect(
      table.ranked.map((entry) => [
        entry.position,
        entry.userId,
        entry.start,
        entry.end,
        entry.gain,
        entry.changeLine,
      ]),
    ).toEqual([
      [1, "noor", "3.45", "3.75", "+0.30", "C+ to B-"],
      [2, "hassan", "3.30", "3.45", "+0.15", "stays C+"],
      [3, "ahmed", "4.05", "4.10", "+0.05", "stays B"],
    ]);
    expect(
      table.noGain.map((entry) => [entry.userId, entry.gain, entry.position]),
    ).toEqual([
      ["mariam", "−0.05", null],
      ["guest", null, null],
    ]);
    expect(table.unranked.map((entry) => [entry.userId, entry.gain])).toEqual([
      ["omar", "+0.05"],
    ]);
  });

  it("reads football in whole OVR and a tier Group in Tier points, with no band line", () => {
    const football = mostImprovedTable(
      [row("a", 1, 4)],
      [level("a", { start: 66, end: 70 })],
      "level",
      "football",
      "en",
    );
    expect(football.ranked[0]).toEqual(
      expect.objectContaining({
        start: "66",
        end: "70",
        gain: "+4",
        changeLine: null,
      }),
    );

    const tier = mostImprovedTable(
      [row("a", 1, 4), row("b", 2, 4)],
      [
        level("a", { start: 1180, end: 1215 }),
        level("b", { start: 1240, end: 1240 }),
      ],
      "tier",
      "football",
      "en",
    );
    expect(
      tier.ranked.map((entry) => [entry.start, entry.end, entry.gain]),
    ).toEqual([["1,180", "1,215", "+35"]]);
    expect(tier.noGain.map((entry) => entry.gain)).toEqual(["0"]);
  });
});

describe("copy", () => {
  it("signs a gain with a true minus", () => {
    expect(formatImprovementGain(-5, "level", "padel")).toBe("−0.05");
    expect(formatImprovementGain(0, "level", "padel")).toBe("0.00");
    expect(formatImprovementGain(-2, "level", "football")).toBe("−2");
  });

  it("names the end column Close once the Season has closed", () => {
    expect(mostImprovedColumns("active", "en").end).toBe("Now");
    expect(mostImprovedColumns("closed", "en").end).toBe("Close");
  });

  it("explains each view under its table", () => {
    expect(
      standingViewFooter(
        "most-improved",
        { ladder: "level", sport: "padel" },
        "en",
        3,
      ),
    ).toBe(
      "Gain is the change in level since the season opened. Play 3 games in the group this season to be ranked.",
    );
    expect(
      standingViewFooter(
        "most-improved",
        { ladder: "tier", sport: "football" },
        "en",
        1,
      ),
    ).toBe(
      "Gain is the change in tier points since the season opened. Play a game in the group this season to be ranked.",
    );
    expect(
      standingViewFooter(
        "by-level",
        { ladder: "level", sport: "football" },
        "en",
      ),
    ).toContain("ranges of 15");
  });

  it("speaks a row's change", () => {
    expect(
      mostImprovedSpoken(
        {
          position: 1,
          start: "3.45",
          end: "3.75",
          gain: "+0.30",
          changeLine: "C+ to B-",
        },
        "Noor S.",
        "en",
      ),
    ).toBe("1. Noor S., from 3.45 to 3.75, +0.30. C+ to B-.");
  });

  it("has every view string in Arabic", () => {
    expect(
      standingViewOptions(
        {
          verified: true,
          hasTier: false,
          hasSeasons: true,
          seasonInView: true,
        },
        "ar",
      ).map((option) => option.label),
    ).toEqual(["الإجمالي", "حسب المستوى", "الأكثر تحسنًا"]);
  });
});
