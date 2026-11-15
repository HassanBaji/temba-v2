import { describe, expect, it } from "vitest";

import { jpegToPdf } from "./image-pdf";
import {
  standingShareCard,
  standingShareCsv,
  standingShareFileName,
  standingSharePreview,
  standingShareTable,
  standingShareWhat,
  standingViewFromQuery,
  type StandingShareInput,
  type StandingShareRowData,
  type StandingShareSeason,
} from "./standing-share";
import type { StandingLevelData } from "./standing-views";

const NOW = new Date("2026-12-05T10:00:00Z");

const season: StandingShareSeason = {
  id: "s3",
  name: "Season 3",
  startsOn: "2026-11-01",
  endsOn: "2027-01-31",
  closedAt: null,
  status: "active",
};

type Seed = [
  name: string,
  played: number,
  wins: number,
  draws: number,
  losses: number,
  diff: number,
];

const seeds: Seed[] = [
  ["Ahmed K.", 8, 6, 1, 1, 9],
  ["Hassan Haji", 8, 5, 2, 1, 7],
  ["Sara M.", 7, 5, 1, 1, 8],
  ["Yusuf A.", 8, 4, 2, 2, 3],
  ["Mariam H.", 8, 4, 1, 3, 1],
  ["Khalil R.", 6, 3, 1, 2, 2],
  ["Noor S.", 3, 3, 0, 0, 6],
  ["Jassim F.", 7, 2, 2, 3, -3],
  ["Layla B.", 8, 1, 1, 6, -10],
  ["Fatima D.", 0, 0, 0, 0, 0],
];

function rows(viewer = "Hassan Haji"): StandingShareRowData[] {
  let position = 0;
  return seeds.map(([name, played, wins, draws, losses, diff]) => ({
    userId: name,
    name,
    nickname: null,
    position: played > 0 ? ++position : null,
    ranked: played > 0,
    played,
    wins,
    draws,
    losses,
    points: wins * 3 + draws,
    diff,
    isViewer: name === viewer,
  }));
}

function input(
  overrides: Partial<StandingShareInput> = {},
): StandingShareInput {
  return {
    view: "overall",
    rows: rows(),
    levels: null,
    season,
    groupName: "Tuesday Night Padel",
    sport: "padel",
    highlight: false,
    now: NOW,
    ...overrides,
  };
}

function level(
  userId: string,
  values: Partial<Omit<StandingLevelData, "userId">>,
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

const padelLevels = {
  ladder: "level" as const,
  sport: "padel",
  members: [
    level("Ahmed K.", {
      band: "B2",
      start: 405,
      end: 410,
      startBand: "B2",
      endBand: "B2",
    }),
    level("Hassan Haji", {
      band: "C1",
      start: 330,
      end: 345,
      startBand: "C1",
      endBand: "C1",
    }),
    level("Sara M.", {
      band: "B3",
      start: 370,
      end: 380,
      startBand: "B3",
      endBand: "B3",
    }),
    level("Yusuf A.", {
      band: "C1",
      start: 345,
      end: 350,
      startBand: "C1",
      endBand: "C1",
    }),
    level("Mariam H.", {
      band: "C2",
      start: 325,
      end: 320,
      startBand: "C2",
      endBand: "C2",
    }),
    level("Khalil R.", {
      band: "C2",
      start: 290,
      end: 310,
      startBand: "C3",
      endBand: "C2",
    }),
    level("Noor S.", {
      band: "B3",
      start: 345,
      end: 375,
      startBand: "C1",
      endBand: "B3",
    }),
    level("Jassim F.", {
      band: "C3",
      start: 290,
      end: 285,
      startBand: "C3",
      endBand: "C3",
    }),
    level("Layla B.", {
      band: "D1",
      start: 250,
      end: 240,
      startBand: "D1",
      endBand: "D1",
    }),
    level("Fatima D.", {
      band: "D2",
      start: 205,
      end: 205,
      startBand: "D2",
      endBand: "D2",
    }),
  ],
};

describe("the sheet", () => {
  it("says what is on screen", () => {
    expect(standingShareWhat(season, "overall", "en")).toBe(
      "Season 3, overall",
    );
    expect(standingShareWhat(null, "by-level", "en")).toBe(
      "All-time, by level",
    );
  });

  it("names the buttons by format and mentions the highlight only where it shows", () => {
    expect(standingSharePreview("story", true, "en")).toEqual({
      title: "Story image",
      description: "PNG, 1080 × 1920. The top 8. Your row is highlighted.",
      highlights: true,
      primary: { action: "share-image", label: "Share image" },
      secondary: { action: "save-image", label: "Save to Photos" },
    });
    expect(standingSharePreview("csv", true, "en").description).toBe(
      "One row per player, every column.",
    );
    expect(standingSharePreview("link", false, "en")).toEqual(
      expect.objectContaining({
        primary: { action: "copy-link", label: "Copy link" },
        secondary: null,
      }),
    );
  });
});

describe("standingShareCard", () => {
  it("draws the Overall story as design 2b: the top 8, then what is left", () => {
    const card = standingShareCard(input(), "story", "en");
    expect(card).toEqual(
      expect.objectContaining({
        range: "1 NOV – 31 JAN",
        kicker: "SEASON 3",
        title: "Standing",
        subtitle: "Tuesday Night Padel",
        caption: "Overall, after 35 days",
        columns: { middle: "W–D–L", value: "PTS" },
        footStart: "and 1 more ranked, 1 unranked",
        footEnd: "Win 3, draw 1",
      }),
    );
    expect(card.rows).toHaveLength(8);
    expect(card.rows[1]).toEqual({
      key: "Hassan Haji",
      position: "2",
      name: "Hassan Haji",
      middle: "5–2–1",
      value: "17",
      highlighted: false,
    });
  });

  it("marks the viewer when asked, and adds them below the cut", () => {
    expect(
      standingShareCard(input({ highlight: true }), "story", "en").rows[1]
        ?.highlighted,
    ).toBe(true);
    const square = standingShareCard(
      input({ rows: rows("Layla B."), highlight: true }),
      "square",
      "en",
    );
    expect(square.rows.map((row) => row.position)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "9",
    ]);
    expect(square.rows.at(-1)?.highlighted).toBe(true);
    expect(square.footStart).toBe("After 35 days. Win 3, draw 1");
  });

  it("shares the viewer's category By level, as design 2c", () => {
    const card = standingShareCard(
      input({ view: "by-level", levels: padelLevels, highlight: true }),
      "square",
      "en",
    );
    expect(card.title).toBe("Category C");
    expect(card.subtitle).toBe("Tuesday Night Padel, by level");
    expect(
      card.rows.map((row) => [
        row.position,
        row.name,
        row.middle,
        row.value,
        row.highlighted,
      ]),
    ).toEqual([
      ["1", "Hassan Haji", "C+", "17", true],
      ["2", "Yusuf A.", "C+", "14", false],
      ["3", "Mariam H.", "C", "13", false],
      ["4", "Khalil R.", "C", "10", false],
      ["5", "Jassim F.", "C-", "8", false],
    ]);
  });

  it("leads Most improved with the top gainer, as design 2d", () => {
    const card = standingShareCard(
      input({ view: "most-improved", levels: padelLevels }),
      "story",
      "en",
    );
    expect(card.title).toBe("Most improved");
    expect(card.subtitle).toBe(
      "Tuesday Night Padel, level gained after 35 days",
    );
    expect(card.lead).toEqual({
      position: "1",
      name: "Noor S.",
      value: "+0.30",
      line: "3.45 to 3.75, C+ to B-",
      highlighted: false,
    });
    expect(
      card.rows.map((row) => [row.position, row.middle, row.value]),
    ).toEqual([
      ["2", "C- to C", "+0.20"],
      ["3", "stays C+", "+0.15"],
      ["4", "stays B-", "+0.10"],
      ["5", "stays B", "+0.05"],
      ["6", "stays C+", "+0.05"],
    ]);
    expect(card.footStart).toBe("Ranked players only");
  });

  it("reads All-time from when the Group began", () => {
    const card = standingShareCard(
      input({ season: null, since: "2026-05-01T08:00:00Z" }),
      "story",
      "en",
    );
    expect(card.kicker).toBe("ALL-TIME");
    expect(card.range).toBe("SINCE 1 MAY");
    expect(card.caption).toBe("Overall, every game");
  });
});

describe("standingShareTable", () => {
  it("lays out the PDF as design 2e: level and set difference, unranked last", () => {
    const table = standingShareTable(
      input({ levels: padelLevels, highlight: true }),
      "en",
    );
    expect(table.subtitle).toBe(
      "Season 3 standing, overall. After 35 days of 92",
    );
    expect(table.columns.map((column) => column.label)).toEqual([
      "",
      "Player",
      "Level",
      "P",
      "W",
      "D",
      "L",
      "Sets",
      "PTS",
    ]);
    expect(table.sections[0]?.rows[1]).toEqual(
      expect.objectContaining({
        cells: ["2", "Hassan Haji", "C+", "8", "5", "2", "1", "+7", "17"],
        highlighted: true,
      }),
    );
    expect(table.sections[0]?.rows[8]?.cells[7]).toBe("−10");
    expect(table.sections[1]).toEqual(
      expect.objectContaining({ label: "Unranked", note: "No games yet" }),
    );
    expect(table.sections[1]?.rows[0]?.cells[0]).toBe("–");
    expect(table.footer).toContain("SETS is set difference.");
  });

  it("drops the Level column on a Group with no Temba Level", () => {
    const table = standingShareTable(input(), "en");
    expect(table.columns.map((column) => column.key)).not.toContain("level");
  });

  it("splits By level into headed sections and Most improved into its own columns", () => {
    const byLevel = standingShareTable(
      input({ view: "by-level", levels: padelLevels }),
      "en",
    );
    expect(byLevel.sections.map((section) => section.label)).toEqual([
      "Category B",
      "Category C",
      "Category D",
      "Unranked",
    ]);

    const improved = standingShareTable(
      input({ view: "most-improved", levels: padelLevels }),
      "en",
    );
    expect(improved.columns.map((column) => column.label)).toEqual([
      "",
      "Player",
      "Change",
      "Start",
      "Now",
      "Gain",
    ]);
    expect(improved.sections.map((section) => section.label)).toEqual([
      null,
      "No gain",
      "Unranked",
    ]);
  });
});

describe("standingShareCsv", () => {
  it("writes plain numbers, a Section column when headed, and a BOM", () => {
    const csv = standingShareCsv(
      standingShareTable(
        input({ view: "most-improved", levels: padelLevels }),
        "en",
      ),
      "en",
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("﻿Section,Position,Player,Change,Start,End,Gain");
    expect(lines[1]).toBe(",1,Noor S.,C+ to B-,3.45,3.75,0.30");
    expect(lines).toContain("No gain,,Mariam H.,stays C,3.25,3.20,-0.05");
  });

  it("never lets a name run as a formula, and quotes commas", () => {
    const tricky = rows().map((row, index) =>
      index === 0
        ? { ...row, name: "=HYPERLINK(1)" }
        : index === 1
          ? { ...row, name: "Haji, Hassan" }
          : row,
    );
    const csv = standingShareCsv(
      standingShareTable(input({ rows: tricky }), "en"),
      "en",
    );
    expect(csv).toContain("1,'=HYPERLINK(1),8,6,1,1,9,19");
    expect(csv).toContain('2,"Haji, Hassan",8,5,2,1,7,17');
  });
});

describe("links and files", () => {
  it("reads a shared link's lens and view back, ignoring what it does not know", () => {
    expect(
      standingViewFromQuery({ season: "s3", view: "by-level" }, ["s3"]),
    ).toEqual({ seasonId: "s3", view: "by-level" });
    expect(
      standingViewFromQuery({ season: "all-time", view: "most-improved" }, [
        "s3",
      ]),
    ).toEqual({ seasonId: null, view: "most-improved" });
    expect(
      standingViewFromQuery({ season: "gone", view: "x" }, ["s3"]),
    ).toEqual({
      seasonId: undefined,
      view: undefined,
    });
  });

  it("names files in ASCII", () => {
    expect(standingShareFileName({ season, view: "by-level" }, "png")).toBe(
      "temba-standing-season-3-by-level.png",
    );
    expect(
      standingShareFileName(
        { season: { ...season, name: "الموسم 3" }, view: "overall" },
        "csv",
      ),
    ).toBe("temba-standing-3-overall.csv");
    expect(
      standingShareFileName({ season: null, view: "overall" }, "pdf"),
    ).toBe("temba-standing-all-time-overall.pdf");
  });
});

describe("jpegToPdf", () => {
  it("wraps the image in one A4 page with a valid cross-reference table", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0x01, 0x02, 0xff, 0xd9]);
    const pdf = jpegToPdf(jpeg, { width: 1240, height: 1754 });
    const text = Array.from(pdf, (byte) => String.fromCharCode(byte)).join("");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 595.28 841.89]");
    expect(text).toContain("/Width 1240 /Height 1754");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...text.matchAll(/(\d{10}) 00000 n/g)].map((match) =>
      Number(match[1]),
    );
    offsets.forEach((offset, index) => {
      expect(text.slice(offset, offset + 7)).toBe(`${index + 1} 0 obj`);
    });
  });
});
