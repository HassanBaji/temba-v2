import { describe, expect, it } from "vitest";

import type { BoardPlayer } from "./football-board";
import {
  teamsPlayerCardForm,
  teamsPlayerCardHead,
} from "./football-teams-card";

const ranked = {
  band: "hamour" as const,
  place: 3,
  points: 1240,
  provisional: false,
  gamesOfFive: 5,
};

function player(extra: Partial<BoardPlayer> = {}): BoardPlayer {
  return {
    userId: "p",
    name: "Tariq Nabeel",
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: null,
    sideIndex: null,
    goals: 0,
    isViewer: false,
    tier: ranked,
    balanceStrength: 1240,
    ...extra,
  };
}

const onWhite = { balanceOn: "tierPoints" as const, sideName: "White" };

describe("teamsPlayerCardHead", () => {
  it("names the team, the usual position and the month's move", () => {
    expect(
      teamsPlayerCardHead(player(), { ...onWhite, pointsThisMonth: 3 }, "en"),
    ).toMatchObject({
      name: "Tariq Nabeel",
      subtitle: "White, usually MID",
      ratingValue: "1,240",
      ratingLabel: "points, +3 this month",
    });
  });

  it("says only points when nothing moved or the move is not loaded", () => {
    for (const pointsThisMonth of [0, null, undefined]) {
      expect(
        teamsPlayerCardHead(player(), { ...onWhite, pointsThisMonth }, "en")
          .ratingLabel,
      ).toBe("points");
    }
  });

  it("reads New for a Provisional tier, with the Games left", () => {
    const provisional = player({
      tier: { ...ranked, provisional: true, place: null, gamesOfFive: 2 },
    });
    expect(
      teamsPlayerCardHead(
        provisional,
        { ...onWhite, pointsThisMonth: 12 },
        "en",
      ),
    ).toMatchObject({
      subtitle: "White, usually MID. Not rated yet, 3 more games to go",
      ratingValue: "New",
      ratingLabel: "points, after 5 games",
    });
  });

  it("reads Not placed before a Manual split places the player", () => {
    expect(
      teamsPlayerCardHead(
        player(),
        { balanceOn: "tierPoints", sideName: null, pointsThisMonth: null },
        "en",
      ).subtitle,
    ).toBe("Not placed, usually MID");
  });

  it("shows a Guest player no Tier points", () => {
    expect(
      teamsPlayerCardHead(
        player({ guest: true, tier: null }),
        { ...onWhite, pointsThisMonth: 0 },
        "en",
      ),
    ).toMatchObject({ ratingValue: "–", ratingLabel: "points" });
  });

  it("labels the OVR off a tier Group", () => {
    expect(
      teamsPlayerCardHead(
        player({ tier: null, ovr: 72, balanceStrength: 72 }),
        { balanceOn: "ovr", sideName: "Black", pointsThisMonth: null },
        "en",
      ),
    ).toMatchObject({ ratingValue: "72", ratingLabel: "OVR" });
  });
});

describe("teamsPlayerCardForm", () => {
  it("pads the strip to five and counts the Games played", () => {
    expect(teamsPlayerCardForm(["won", "lost"], 2, "en")).toEqual({
      slots: ["won", "lost", "not-played", "not-played", "not-played"],
      caption: "2 played so far",
    });
  });

  it("reads Last five once five are played, and says so when none are", () => {
    expect(
      teamsPlayerCardForm(["won", "lost", "won", "won", "lost"], 30, "en")
        .caption,
    ).toBe("Last five, oldest first");
    expect(teamsPlayerCardForm([], 0, "en").caption).toBe("Nothing played yet");
  });
});
