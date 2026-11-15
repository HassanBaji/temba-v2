import { describe, expect, it } from "vitest";

import {
  paddedForm,
  seasonStandingPosition,
  seasonStandingTable,
  standingLegend,
  standingRecordLabel,
  standingRulesLine,
  standingShowsDraws,
  standingTierFootnote,
  type SeasonStandingMatch,
  unrankedNote,
} from "./season-standing";

const ADA = "ada";
const BEN = "ben";
const CARA = "cara";
const DAN = "dan";

const members = [
  { userId: ADA, name: "Ada" },
  { userId: BEN, name: "Ben" },
  { userId: CARA, name: "Cara" },
  { userId: DAN, name: "Dan" },
];

let clock = 0;

function match(
  slot1: string[],
  slot2: string[],
  sets: [number, number][],
  overrides: Partial<SeasonStandingMatch> = {},
): SeasonStandingMatch {
  clock += 1;
  return {
    slot1UserIds: slot1,
    slot2UserIds: slot2,
    status: "completed",
    playedAt: new Date(Date.UTC(2026, 0, clock)),
    sets: sets.map(([slot1GamesWon, slot2GamesWon]) => ({
      slot1GamesWon,
      slot2GamesWon,
    })),
    ...overrides,
  };
}

describe("seasonStandingTable", () => {
  it("gives 3, 1 and 0 to every player on the side and ranks by points", () => {
    const rows = seasonStandingTable(
      [
        match([ADA, BEN], [CARA, DAN], [[6, 3]]),
        match([ADA, CARA], [BEN, DAN], [[6, 6]]),
        match([ADA, DAN], [BEN, CARA], [[2, 6]]),
      ],
      members,
      { minRankedGames: 1 },
    );

    expect(
      rows.map((row) => [
        row.name,
        row.played,
        row.wins,
        row.draws,
        row.losses,
        row.points,
      ]),
    ).toEqual([
      ["Ben", 3, 2, 1, 0, 7],
      ["Ada", 3, 1, 1, 1, 4],
      ["Cara", 3, 1, 1, 1, 4],
      ["Dan", 3, 0, 1, 2, 1],
    ]);
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
  });

  it("lists members with too few games under the ranked rows without a position", () => {
    const rows = seasonStandingTable(
      [
        match([ADA], [BEN], [[6, 2]]),
        match([ADA], [BEN], [[6, 2]]),
        match([ADA], [BEN], [[6, 2]]),
        match([ADA], [CARA], [[6, 2]]),
      ],
      members,
      { minRankedGames: 3 },
    );

    expect(rows.map((row) => [row.name, row.position, row.ranked])).toEqual([
      ["Ada", 1, true],
      ["Ben", 2, true],
      ["Dan", null, false],
      ["Cara", null, false],
    ]);
    expect(seasonStandingPosition(rows, CARA)).toBeNull();
    expect(seasonStandingPosition(rows, BEN)).toBe(2);
  });

  it("breaks equal points on wins", () => {
    const rows = seasonStandingTable(
      [
        match([ADA], [CARA], [[6, 0]]),
        match([BEN], [DAN], [[6, 6]]),
        match([BEN], [DAN], [[6, 6]]),
        match([BEN], [DAN], [[6, 6]]),
      ],
      members,
      { minRankedGames: 1 },
    );
    expect(rows.map((row) => [row.name, row.points, row.wins])).toEqual([
      ["Ada", 3, 1],
      ["Ben", 3, 0],
      ["Dan", 3, 0],
      ["Cara", 0, 0],
    ]);
  });

  it("breaks equal points and wins on head-to-head before difference", () => {
    const rows = seasonStandingTable(
      [
        match(
          [ADA],
          [CARA],
          [
            [6, 0],
            [6, 0],
          ],
        ),
        match(
          [ADA],
          [DAN],
          [
            [6, 0],
            [6, 0],
          ],
        ),
        match([BEN], [ADA], [[6, 4]]),
        match([BEN], [CARA], [[6, 4]]),
        match([DAN], [BEN], [[6, 0]]),
      ],
      members,
      { minRankedGames: 1 },
    );
    expect(rows.map((row) => [row.name, row.points, row.diff])).toEqual([
      ["Ben", 6, 1],
      ["Ada", 6, 3],
      ["Dan", 3, -1],
      ["Cara", 0, -3],
    ]);
  });

  it("then falls to difference, then fewer games played, then name", () => {
    const byDiff = seasonStandingTable(
      [
        match(
          [ADA],
          [CARA],
          [
            [6, 0],
            [6, 0],
          ],
        ),
        match(
          [BEN],
          [CARA],
          [
            [6, 0],
            [6, 0],
          ],
        ),
        match([DAN], [BEN], [[6, 0]]),
        match([DAN], [ADA], [[6, 0]]),
        match([DAN], [ADA], [[6, 0]]),
      ],
      members,
      { minRankedGames: 1 },
    );
    expect(
      byDiff
        .filter((row) => row.points === 3)
        .map((row) => [row.name, row.points, row.diff]),
    ).toEqual([
      ["Ben", 3, 1],
      ["Ada", 3, 0],
    ]);

    const byPlayed = seasonStandingTable(
      [
        match(
          [ADA],
          [CARA],
          [
            [6, 0],
            [6, 0],
          ],
        ),
        match(
          [BEN],
          [CARA],
          [
            [6, 0],
            [6, 0],
            [6, 0],
          ],
        ),
        match([DAN], [BEN], [[6, 0]]),
        match([DAN], [CARA], [[6, 0]]),
      ],
      members,
      { minRankedGames: 1 },
    );
    expect(
      byPlayed
        .filter((row) => row.points === 3)
        .map((row) => [row.name, row.diff, row.played]),
    ).toEqual([
      ["Ada", 2, 1],
      ["Ben", 2, 2],
    ]);

    const circle = seasonStandingTable(
      [
        match([ADA], [BEN], [[6, 4]]),
        match([BEN], [CARA], [[6, 0]]),
        match([CARA], [ADA], [[6, 0]]),
      ],
      members.slice(0, 3),
      { minRankedGames: 1 },
    );
    expect(circle.map((row) => row.name)).toEqual(["Ada", "Ben", "Cara"]);
  });

  it("counts only completed Matches and reads difference in games for football", () => {
    const rows = seasonStandingTable(
      [
        match([ADA], [BEN], [[4, 2]]),
        match([ADA], [BEN], [[0, 1]], { status: "pending" }),
        match([ADA], [BEN], [], { status: "cancelled" }),
      ],
      members.slice(0, 2),
      { minRankedGames: 1, diffUnit: "games" },
    );
    expect(rows.map((row) => [row.name, row.played, row.diff])).toEqual([
      ["Ada", 1, 2],
      ["Ben", 1, -2],
    ]);
  });

  it("keeps the latest five results as form, oldest first", () => {
    const rows = seasonStandingTable(
      [
        match([ADA], [BEN], [[6, 0]]),
        match([ADA], [BEN], [[0, 6]]),
        match([ADA], [BEN], [[6, 6]]),
        match([ADA], [BEN], [[6, 0]]),
        match([ADA], [BEN], [[6, 0]]),
        match([ADA], [BEN], [[0, 6]]),
      ],
      members.slice(0, 2),
      { minRankedGames: 1 },
    );
    expect(rows[0]?.name).toBe("Ada");
    expect(rows[0]?.form).toEqual(["lost", "draw", "won", "won", "lost"]);
    expect(paddedForm(["won"])).toEqual([
      "won",
      "not-played",
      "not-played",
      "not-played",
      "not-played",
    ]);
  });
});

describe("standing copy", () => {
  it("reads the record, the unranked note and the rules", () => {
    expect(standingRecordLabel({ wins: 5, draws: 2, losses: 1 })).toBe("5–2–1");
    expect(unrankedNote("en", 3)).toBe("Fewer than 3 games");
    expect(unrankedNote("en", 1)).toBe("No games yet");
    expect(standingRulesLine("sets", "en", 3)).toContain(
      "Play 3 games to be ranked.",
    );
    expect(standingRulesLine("sets", "en", 1)).toContain("One game ranks you.");
    expect(standingRulesLine("sets", "en")).toContain("set difference");
    expect(standingRulesLine("games", "en")).toContain("score difference");
  });

  it("keys the column letters and the points under the table", () => {
    expect(standingLegend(true, "en")).toBe(
      "P played, W won, D drawn, L lost. A win is 3 points, a draw 1.",
    );
    expect(standingLegend(false, "en")).toBe(
      "P played, W won, L lost. A win is 3 points.",
    );
  });

  it("leaves the points to the legend", () => {
    expect(standingRulesLine("sets", "en")).not.toContain("draw");
  });

  it("reads in Arabic", () => {
    expect(unrankedNote("ar", 1)).toBe("لا مباريات بعد");
    expect(standingRulesLine("sets", "ar")).toContain("فارق الأشواط");
    expect(standingLegend(true, "ar")).toBe(
      "ل لعب، ف فوز، ت تعادل، خ خسارة. الفوز 3 نقاط والتعادل 1.",
    );
    expect(standingLegend(false, "ar")).toBe(
      "ل لعب، ف فوز، خ خسارة. الفوز 3 نقاط.",
    );
  });
});

describe("standingTierFootnote", () => {
  it("says it is the season and points to Members on a tier Group", () => {
    expect(
      standingTierFootnote({ hasTier: true, seasonInView: true }, "en"),
    ).toEqual({
      before:
        "Counts this season’s games and starts again next season. How strong each player is in the group, their tier, is on ",
      membersLink: "Members",
      after: ".",
    });
  });

  it("drops the season sentence when no Season is in view", () => {
    expect(
      standingTierFootnote({ hasTier: true, seasonInView: false }, "en"),
    ).toEqual({
      before: "How strong each player is in the group, their tier, is on ",
      membersLink: "Members",
      after: ".",
    });
  });

  it("is absent on a Group with no tier", () => {
    expect(
      standingTierFootnote({ hasTier: false, seasonInView: true }, "en"),
    ).toBeNull();
  });

  it("reads in Arabic", () => {
    expect(
      standingTierFootnote({ hasTier: true, seasonInView: true }, "ar"),
    ).toEqual({
      before:
        "يحتسب الترتيب مباريات هذا الموسم ويبدأ من جديد في الموسم القادم. قوة كل لاعب في المجموعة، أي فئته، تجدها في ",
      membersLink: "الأعضاء",
      after: ".",
    });
  });
});

describe("standingShowsDraws", () => {
  it("always shows draws on football", () => {
    expect(standingShowsDraws("football", [])).toBe(true);
    expect(standingShowsDraws("football", [{ draws: 0 }])).toBe(true);
  });

  it("hides draws on padel until a row has one", () => {
    expect(standingShowsDraws("padel", [{ draws: 0 }, { draws: 0 }])).toBe(
      false,
    );
    expect(standingShowsDraws("padel", [{ draws: 0 }, { draws: 1 }])).toBe(
      true,
    );
    expect(standingShowsDraws(null, [])).toBe(false);
  });
});
