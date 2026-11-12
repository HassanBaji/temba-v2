import { describe, expect, it } from "vitest";

import { levelFromOvr } from "./football-ovr";
import { BAND_MIDPOINTS } from "./level";
import {
  footballHeroLevelView,
  footballLastTenSummary,
  footballLevelCardView,
  footballMatchRowView,
  footballOverallView,
  footballRoleView,
  type FootballMatchInput,
} from "./player-profile-football";

function match(
  overrides: Partial<FootballMatchInput> = {},
): FootballMatchInput {
  return {
    matchId: "match-1",
    gameId: "game-1",
    playedAt: "2026-10-24T17:00:00.000Z",
    outcome: "won",
    score: { us: 5, them: 3 },
    goals: 2,
    game: {
      name: "Thursday 5s",
      hasCustomName: true,
      windowStart: null,
      windowEnd: null,
      groupName: "Riffa Ballers",
      venueName: "Riffa Pitch",
    },
    canOpenGame: true,
    ...overrides,
  };
}

describe("footballLevelCardView", () => {
  it("reads No Level yet without a football Rating", () => {
    expect(footballLevelCardView(null, "en")).toEqual({
      kind: "none",
      label: "No Level yet",
    });
  });

  it("shows the starting Level as OVR, hatched, while no football Match has rated", () => {
    const view = footballLevelCardView(
      {
        levelBand: "C1",
        levelValue: 3.6,
        provisional: true,
        ratedMatchCount: 0,
        ratedMatchesRemaining: 5,
      },
      "en",
    );
    expect(view).toMatchObject({
      kind: "rated",
      displayBand: "C+",
      level: "70",
      provisional: true,
      fillPercent: 0,
      lines: ["Starting Level", "Games that count for Temba Level move it"],
    });
  });

  it("reads like the padel Level card once a football Match rates", () => {
    const view = footballLevelCardView(
      {
        levelBand: "C1",
        levelValue: 3.6,
        provisional: true,
        ratedMatchCount: 2,
        ratedMatchesRemaining: 3,
      },
      "en",
    );
    expect(view.kind === "rated" && view.lines).not.toContain("Starting Level");
  });

  it("reads an OVR of 74 as C+, on its way to B-", () => {
    const view = footballLevelCardView(
      {
        levelBand: "C1",
        levelValue: levelFromOvr(74),
        provisional: false,
        ratedMatchCount: 6,
        ratedMatchesRemaining: 0,
      },
      "en",
    );
    expect(view).toMatchObject({
      kind: "rated",
      displayBand: "C+",
      level: "74",
      fillPercent: 76,
      lines: ["Confirmed, 6 rated matches", "2 to B- · 76% through C+"],
    });
  });
});

describe("footballHeroLevelView", () => {
  it("reads each self-placement as its starting OVR, the placement word as the caption", () => {
    const placed = (
      levelBand: "D3" | "C3" | "C1" | "B3",
    ): Parameters<typeof footballHeroLevelView>[0] => ({
      levelBand,
      levelValue: BAND_MIDPOINTS[levelBand],
      provisional: true,
      ratedMatchCount: 0,
      ratedMatchesRemaining: 5,
    });
    expect(
      (["D3", "C3", "C1", "B3"] as const).map((band) => {
        const view = footballHeroLevelView(placed(band), "en");
        return [view.ovr, view.placement];
      }),
    ).toEqual([
      ["43", "Beginner"],
      ["61", "Casual"],
      ["72", "Competitive"],
      ["78", "Pro"],
    ]);
  });

  it("rings an OVR of 74 as C+ on its way to B-, without the placement word once a Match counts", () => {
    expect(
      footballHeroLevelView(
        {
          levelBand: "C1",
          levelValue: levelFromOvr(74),
          provisional: false,
          ratedMatchCount: 6,
          ratedMatchesRemaining: 0,
        },
        "en",
      ),
    ).toEqual({
      ovr: "74",
      ovrLabel: "OVR",
      band: "C+",
      ringPercent: 76,
      progress: "76% of the way to B-",
      placement: null,
      spoken: "OVR 74, band C+. 76% of the way to B-",
    });
  });

  it("fills the ring at the top band", () => {
    const view = footballHeroLevelView(
      {
        levelBand: "A",
        levelValue: 6.8,
        provisional: false,
        ratedMatchCount: 9,
        ratedMatchesRemaining: 0,
      },
      "ar",
    );
    expect(view.ringPercent).toBe(100);
    expect(view.placement).toBeNull();
  });
});

describe("footballRoleView", () => {
  it("names a keeper GK", () => {
    expect(footballRoleView({ role: "keeper", position: "fwd" }, "en")).toEqual(
      {
        label: "Keeper",
        code: "GK",
      },
    );
  });

  it("names an outfield player's preferred position", () => {
    expect(
      footballRoleView({ role: "outfield", position: "mid" }, "en"),
    ).toEqual({
      label: "Midfield",
      code: "MID",
    });
    expect(
      footballRoleView({ role: "outfield", position: null }, "en"),
    ).toEqual({
      label: "Outfield",
      code: null,
    });
  });

  it("reads No preference set without a role", () => {
    expect(footballRoleView({ role: null, position: null }, "en")).toEqual({
      label: "No preference set",
      code: null,
    });
  });
});

describe("footballOverallView", () => {
  it("shows Matches, Won, Win rate and Goals", () => {
    expect(
      footballOverallView(
        { played: 4, won: 1, lost: 1, drawn: 2, goals: 7 },
        "en",
      ).tiles,
    ).toEqual([
      { label: "Matches", value: "4" },
      { label: "Won", value: "1" },
      { label: "Win rate", value: "25%" },
      { label: "Goals", value: "7" },
    ]);
  });
});

describe("footballMatchRowView", () => {
  it("leads with the Group, then the day and Venue, the owner's score first", () => {
    expect(footballMatchRowView(match(), "en")).toMatchObject({
      title: "Riffa Ballers",
      meta: "Sat 24 Oct, Riffa Pitch",
      score: "5–3",
      goals: "2 goals",
      canOpenGame: true,
    });
  });

  it("falls back to the Game name, then Friendly game", () => {
    expect(
      footballMatchRowView(
        match({
          game: {
            name: "Thursday 5s",
            hasCustomName: true,
            windowStart: null,
            windowEnd: null,
            groupName: " ",
            venueName: "Riffa Pitch",
          },
        }),
        "en",
      ).title,
    ).toBe("Thursday 5s");
    expect(
      footballMatchRowView(
        match({
          game: {
            name: null,
            hasCustomName: false,
            windowStart: null,
            windowEnd: null,
            groupName: null,
            venueName: "Riffa Pitch",
          },
        }),
        "en",
      ).title,
    ).toBe("Friendly game");
  });

  it("names a Game by its window in the viewer's locale", () => {
    expect(
      footballMatchRowView(
        match({
          game: {
            name: "Wed 10:30 AM - 12:00 PM",
            hasCustomName: false,
            windowStart: "2026-11-04T07:30:00.000Z",
            windowEnd: "2026-11-04T09:00:00.000Z",
            groupName: null,
            venueName: "Riffa Pitch",
          },
        }),
        "ar",
      ).title,
    ).toBe("الأربعاء، 10:30 ص – 12:00 م");
  });

  it("leaves goals out when the owner scored none", () => {
    expect(footballMatchRowView(match({ goals: 0 }), "en").goals).toBeNull();
    expect(footballMatchRowView(match({ goals: 1 }), "en").goals).toBe(
      "1 goal",
    );
  });

  it("reads the result, day, Game, Venue and goals aloud", () => {
    expect(
      footballMatchRowView(
        match({ outcome: "draw", score: { us: 2, them: 2 } }),
        "en",
      ).accessibilityLabel,
    ).toBe(
      "Drew 2–2, Saturday 24 October, Riffa Ballers, Riffa Pitch, scored 2 goals",
    );
  });
});

describe("football profile in Arabic", () => {
  it("reads the role, the tiles and the row", () => {
    expect(footballRoleView({ role: "keeper", position: null }, "ar")).toEqual({
      label: "حارس",
      code: "حارس",
    });
    expect(footballMatchRowView(match({ goals: 2 }), "ar").goals).toBe("هدفان");
    expect(
      footballLevelCardView(
        {
          levelBand: "C1",
          levelValue: 3.6,
          provisional: true,
          ratedMatchCount: 0,
          ratedMatchesRemaining: 5,
        },
        "ar",
      ),
    ).toMatchObject({
      lines: ["المستوى الابتدائي", "تحرّكه المباريات التي تُحتسب لمستوى Temba"],
    });
  });
});

describe("footballLastTenSummary", () => {
  it("counts draws and offers no See all", () => {
    const summary = footballLastTenSummary(
      [
        match({ outcome: "won" }),
        match({ outcome: "draw" }),
        match({ outcome: "lost" }),
      ],
      "en",
    );
    expect(summary.record).toBe("1 won, 1 lost, 1 drawn");
    expect(summary.marks.slice(0, 4)).toEqual([
      "won",
      "draw",
      "lost",
      "not-played",
    ]);
    expect(summary.seeAll).toBeNull();
  });
});
