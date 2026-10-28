import { describe, expect, it } from "vitest";

import {
  filterBySport,
  footballAwaitsResult,
  footballSection,
  footballSections,
} from "./football-hub";
import { createGamesHubFixtures } from "./games-hub-fixtures";
import type { HubGameFootball, HubGameRow } from "./hub-game-row";

const NOW = new Date("2026-10-04T10:00:00Z");
const base = createGamesHubFixtures(NOW).mixed.myGames[0]!;

function football(
  extra: Partial<HubGameFootball> = {},
  row: Partial<HubGameRow> = {},
): HubGameRow {
  return {
    ...base,
    sport: "football",
    registrationStatus: "open",
    windowEnd: new Date(NOW.getTime() + 2 * 60 * 60 * 1000),
    ...row,
    football: {
      sideSize: 5,
      sides: null,
      viewer: { sideIndex: null, role: null, position: null },
      score: null,
      matchId: null,
      matchStatus: null,
      needsViewerConfirmation: false,
      enteredByName: null,
      ...extra,
    },
  };
}

const sides: HubGameFootball["sides"] = [
  { sideIndex: 1, bib: "black", members: [] },
  { sideIndex: 2, bib: "white", members: [] },
];

describe("filterBySport", () => {
  it("keeps every row for All and reads a missing sport as padel", () => {
    const rows = [football(), { ...base, sport: null }];
    expect(filterBySport(rows, "all")).toHaveLength(2);
    expect(filterBySport(rows, "football")).toHaveLength(1);
    expect(filterBySport(rows, "padel")).toEqual([rows[1]]);
  });
});

describe("footballSection", () => {
  it("puts open, full and teams-set Games in their sections", () => {
    expect(footballSection(football(), NOW)).toBe("open");
    expect(
      footballSection(football({}, { registrationStatus: "full" }), NOW),
    ).toBe("full");
    expect(footballSection(football({ sides }), NOW)).toBe("teams");
  });

  it("asks for a result once a played Game the viewer lined up in has no agreed Score", () => {
    const played = { windowEnd: new Date(NOW.getTime() - 60_000) };
    const missing = football(
      { sides, viewer: { sideIndex: 1, role: null, position: null } },
      played,
    );
    expect(footballAwaitsResult(missing, NOW)).toBe(true);
    expect(footballSection(missing, NOW)).toBe("result");
    expect(
      footballAwaitsResult(
        football({ sides, needsViewerConfirmation: true }),
        NOW,
      ),
    ).toBe(true);
    expect(
      footballAwaitsResult(
        football({ sides, matchStatus: "completed" }, played),
        NOW,
      ),
    ).toBe(false);
  });

  it("drops empty sections and skips non-football rows", () => {
    const sections = footballSections([football(), base], NOW);
    expect(sections.map((section) => section.key)).toEqual(["open"]);
    expect(sections[0]?.rows).toHaveLength(1);
  });
});
