import { describe, expect, it } from "vitest";

import {
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
      groupName: "Riffa Ballers",
      venueName: "Riffa Pitch",
    },
    canOpenGame: true,
    ...overrides,
  };
}

describe("footballLevelCardView", () => {
  it("reads No Level yet without a football Rating", () => {
    expect(footballLevelCardView(null)).toEqual({
      kind: "none",
      label: "No Level yet",
    });
  });

  it("shows the starting Level, hatched, while football Games are Unrated", () => {
    const view = footballLevelCardView({
      levelBand: "C1",
      levelValue: 3.6,
      provisional: true,
      ratedMatchCount: 0,
      ratedMatchesRemaining: 5,
    });
    expect(view).toMatchObject({
      kind: "rated",
      displayBand: "C+",
      level: "3.6",
      provisional: true,
      fillPercent: 0,
      lines: ["Starting Level", "Football games don't move it yet"],
    });
  });

  it("reads like the padel Level card once a football Match rates", () => {
    const view = footballLevelCardView({
      levelBand: "C1",
      levelValue: 3.6,
      provisional: true,
      ratedMatchCount: 2,
      ratedMatchesRemaining: 3,
    });
    expect(view.kind === "rated" && view.lines).not.toContain("Starting Level");
  });
});

describe("footballRoleView", () => {
  it("names a keeper GK", () => {
    expect(footballRoleView({ role: "keeper", position: "fwd" })).toEqual({
      label: "Keeper",
      code: "GK",
    });
  });

  it("names an outfield player's preferred position", () => {
    expect(footballRoleView({ role: "outfield", position: "mid" })).toEqual({
      label: "Midfield",
      code: "MID",
    });
    expect(footballRoleView({ role: "outfield", position: null })).toEqual({
      label: "Outfield",
      code: null,
    });
  });

  it("reads No preference set without a role", () => {
    expect(footballRoleView({ role: null, position: null })).toEqual({
      label: "No preference set",
      code: null,
    });
  });
});

describe("footballOverallView", () => {
  it("shows Matches, Won, Win rate and Goals", () => {
    expect(
      footballOverallView({ played: 4, won: 1, lost: 1, drawn: 2, goals: 7 })
        .tiles,
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
    expect(footballMatchRowView(match())).toMatchObject({
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
            groupName: " ",
            venueName: "Riffa Pitch",
          },
        }),
      ).title,
    ).toBe("Thursday 5s");
    expect(
      footballMatchRowView(
        match({
          game: { name: null, groupName: null, venueName: "Riffa Pitch" },
        }),
      ).title,
    ).toBe("Friendly game");
  });

  it("leaves goals out when the owner scored none", () => {
    expect(footballMatchRowView(match({ goals: 0 })).goals).toBeNull();
    expect(footballMatchRowView(match({ goals: 1 })).goals).toBe("1 goal");
  });

  it("reads the result, day, Game, Venue and goals aloud", () => {
    expect(
      footballMatchRowView(
        match({ outcome: "draw", score: { us: 2, them: 2 } }),
      ).accessibilityLabel,
    ).toBe(
      "Drew 2–2, Saturday 24 October, Riffa Ballers, Riffa Pitch, scored 2 goals",
    );
  });
});

describe("footballLastTenSummary", () => {
  it("counts draws and offers no See all", () => {
    const summary = footballLastTenSummary([
      match({ outcome: "won" }),
      match({ outcome: "draw" }),
      match({ outcome: "lost" }),
    ]);
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
