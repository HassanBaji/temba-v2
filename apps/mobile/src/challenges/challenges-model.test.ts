import { NO_CHALLENGE_BOARD_FILTERS } from "@repo/domain/challenge-card";
import { describe, expect, it } from "vitest";

import {
  challengePath,
  MINE_PATH,
  NEW_CHALLENGE_PATH,
  rematchDraft,
  rematchPath,
  setBoardFilter,
  toggleValue,
  type PostOptions,
} from "./challenges-model";

describe("challenge paths", () => {
  it("nest under the Challenges tab", () => {
    expect(challengePath("c1")).toBe("/challenges/c1");
    expect(NEW_CHALLENGE_PATH).toBe("/challenges/new");
    expect(MINE_PATH).toBe("/challenges?tab=mine");
    expect(rematchPath("t1", "t2")).toBe("/challenges/new?team=t1&rematch=t2");
  });
});

describe("rematchDraft", () => {
  const options = {
    teams: [
      {
        id: "gooz",
        displayName: "Gooz FC",
        sport: "football",
        rosterCount: 12,
        formatsPlayable: [5, 6, 7],
        members: [],
        teamLevel: null,
        record: { gamesPlayed: 1, wins: 1, draws: 0, losses: 0 },
        playedTeams: [
          {
            id: "arad",
            displayName: "Arad Athletic",
            teamLevel: { tenths: 28, level: "2.8", band: "C" },
            lastGame: {
              playedAt: new Date("2026-11-01T18:00:00Z"),
              sideSize: 6,
              venueId: "pitches",
            },
          },
        ],
      },
    ],
    venues: {
      padel: [],
      football: [{ id: "pitches", name: "Matchday Pitches", city: "Manama" }],
    },
    defaultDurationMinutes: { padel: 90, football: 60 },
  } satisfies PostOptions;

  it("pre-fills the post form from the Team played", () => {
    expect(rematchDraft(options, "gooz", "arad")).toMatchObject({
      teamId: "gooz",
      sideSize: 6,
      venueIds: ["pitches"],
      levelMin: "C-",
      levelMax: "C+",
      nudgeTeamId: "arad",
    });
  });

  it("opens a blank form for a Team that cannot post or has not played them", () => {
    expect(rematchDraft(options, "other", "arad")).toBeNull();
    expect(rematchDraft(options, "gooz", "hidd")).toBeNull();
  });
});

describe("setBoardFilter", () => {
  it("sets a filter and clears it when picked again", () => {
    const sport = setBoardFilter(NO_CHALLENGE_BOARD_FILTERS, "sport", "padel");
    expect(sport).toEqual({ ...NO_CHALLENGE_BOARD_FILTERS, sport: "padel" });
    expect(setBoardFilter(sport, "sport", "padel")).toEqual(
      NO_CHALLENGE_BOARD_FILTERS,
    );
    expect(setBoardFilter(sport, "sport", null)).toEqual(
      NO_CHALLENGE_BOARD_FILTERS,
    );
  });
});

describe("toggleValue", () => {
  it("adds and removes a pick", () => {
    expect(toggleValue(["fri"], "sat")).toEqual(["fri", "sat"]);
    expect(toggleValue(["fri", "sat"], "fri")).toEqual(["sat"]);
  });
});
