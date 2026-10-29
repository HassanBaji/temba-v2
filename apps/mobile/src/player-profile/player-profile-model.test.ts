import { describe, expect, it } from "vitest";
import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import type { RouterOutputs } from "../trpc/react";
import {
  footballProfileModel,
  footballProfileState,
  playerProfileModel,
  playerProfileState,
} from "./player-profile-model";

const ORIGIN = "https://api.example.com";
const fixtures = createPlayerProfileFixtures();

describe("playerProfileModel", () => {
  it("builds the header, Level card and Overall from one payload", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN);
    expect(model.name).toBe("Elin Nilsson");
    expect(model.imageUri).toBeNull();
    expect(model.subtitle).toBe("Padel, plays at Padelhuset Bromma");
    expect(model.level).toMatchObject({ kind: "rated", displayBand: "B-" });
    expect(model.overall.tiles.map((tile) => tile.value)).toEqual([
      "64",
      "41",
      "64%",
      "61%",
    ]);
  });

  it("builds the Streaks and Preferred Position cards", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN);
    expect(model.streaks).toEqual({
      current: { headline: "4 wins in a row", wonMarks: 4 },
      best: { headline: "7 wins", reachedIn: "March 2026" },
    });
    expect(model.position).toEqual({
      label: "Left side",
      subtitle: "Played left in 72% of matches",
      court: { left: "ink", right: "paper" },
    });
  });

  it("hides the played side below five recorded Matches", () => {
    expect(playerProfileModel(fixtures.provisional, ORIGIN).position).toEqual({
      label: "Either side",
      subtitle: null,
      court: { left: "ink", right: "ink" },
    });
  });

  it("builds the Last 10 strip, the three recent rows and the trend", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN);
    expect(model.trend).toBe("Last 10: +0.3");
    expect(model.lastTen.record).toBe("7 won, 3 lost");
    expect(model.lastTen.marks).toHaveLength(10);
    expect(model.lastTen.seeAll).toBe("See all 10 games");
    expect(model.matches).toHaveLength(10);
    expect(model.recentMatches.map((row) => row.meta)).toEqual([
      "Thu 1 Oct, Tuesday Crew",
      "Mon 28 Sep, Autumn Cup, Round 2",
      "Sat 26 Sep, Autumn Cup, Semi-final",
    ]);
    expect(model.recentMatches[0]).toMatchObject({
      opponents: "vs Sofia L & Adam R",
      sets: ["6\u20134", "6\u20133"],
      delta: "+0.1",
    });
  });

  it("shows No games yet with no See all and no trend for a new player", () => {
    const model = playerProfileModel(fixtures.newPlayer, ORIGIN);
    expect(model.trend).toBeNull();
    expect(model.lastTen).toMatchObject({
      record: "No games yet.",
      ends: null,
      seeAll: null,
    });
    expect(model.lastTen.marks.every((mark) => mark === "not-played")).toBe(
      true,
    );
    expect(model.recentMatches).toEqual([]);
  });

  it("resolves a stored image path against the API origin", () => {
    const model = playerProfileModel(
      {
        ...fixtures.confirmed,
        player: { ...fixtures.confirmed.player, image: "/media/u.png" },
      },
      ORIGIN,
    );
    expect(model.imageUri).toBe(`${ORIGIN}/media/u.png`);
  });

  it("renders a new player with no Level and empty Overall", () => {
    const model = playerProfileModel(fixtures.newPlayer, ORIGIN);
    expect(model.subtitle).toBe("Padel");
    expect(model.level).toEqual({ kind: "none", label: "No Level yet" });
    expect(model.streaks.best.headline).toBe("—");
    expect(model.position.label).toBe("No preference set");
    expect(model.position.court).toEqual({ left: "hatch", right: "hatch" });
    expect(model.overall.tiles.map((tile) => tile.value)).toEqual([
      "0",
      "0",
      "—",
      "—",
    ]);
  });

  it("shows a viewer's own profile with their name, not You", () => {
    expect(playerProfileModel(fixtures.self, ORIGIN).name).toBe("Elin Nilsson");
  });
});

describe("playerProfileState", () => {
  it("reads NOT_FOUND as the refused state", () => {
    const error = { message: "Player not found", data: { code: "NOT_FOUND" } };
    expect(playerProfileState({ data: undefined, error }, ORIGIN)).toEqual({
      status: "refused",
    });
  });

  it("keeps other failures as errors", () => {
    const error = { message: "Network down", data: { code: "INTERNAL" } };
    expect(playerProfileState({ data: undefined, error }, ORIGIN)).toEqual({
      status: "error",
      message: "Network down",
    });
  });

  it("is loading before data arrives", () => {
    expect(
      playerProfileState({ data: undefined, error: null }, ORIGIN),
    ).toEqual({ status: "loading" });
  });
});

const FOOTBALL: RouterOutputs["users"]["footballProfile"] = {
  player: {
    id: "player-1",
    name: "Ali Hasan",
    image: "/media/users/ali.jpg",
    isViewer: false,
  },
  sports: ["football"],
  venue: { name: "Riffa Pitch" },
  rating: {
    level: "C+ 3.6",
    levelBand: "C1",
    provisional: true,
    ratedMatchCount: 0,
    ratedMatchesRemaining: 5,
    levelValue: 3.6,
  },
  role: { role: "outfield", position: "fwd" },
  overall: { played: 2, won: 1, lost: 0, drawn: 1, goals: 3 },
  streaks: {
    current: 0,
    best: 1,
    bestReachedAt: new Date("2026-10-17T17:00:00.000Z"),
  },
  lastMatches: [
    {
      matchId: "match-2",
      gameId: "game-2",
      playedAt: "2026-10-24T17:00:00.000Z",
      outcome: "draw",
      score: { us: 2, them: 2 },
      goals: 0,
      game: { name: "Thursday 5s", groupName: null, venueName: "Riffa Pitch" },
      canOpenGame: false,
    },
    {
      matchId: "match-1",
      gameId: "game-1",
      playedAt: "2026-10-17T17:00:00.000Z",
      outcome: "won",
      score: { us: 5, them: 3 },
      goals: 3,
      game: {
        name: "Thursday 5s",
        groupName: "Riffa Ballers",
        venueName: "Riffa Pitch",
      },
      canOpenGame: true,
    },
  ],
};

describe("footballProfileModel", () => {
  it("builds the football header, Level, position and Overall", () => {
    const model = footballProfileModel(FOOTBALL, ORIGIN);
    expect(model.subtitle).toBe("Football, plays at Riffa Pitch");
    expect(model.imageUri).toBe(`${ORIGIN}/media/users/ali.jpg`);
    expect(model.level).toMatchObject({
      kind: "rated",
      displayBand: "C+",
      lines: ["Starting Level", "Football games don't move it yet"],
    });
    expect(model.trend).toBeNull();
    expect(model.role).toEqual({ label: "Forward", code: "FWD" });
    expect(model.overall.tiles.map((tile) => tile.value)).toEqual([
      "2",
      "1",
      "50%",
      "3",
    ]);
  });

  it("lists every football Match in the Last 10, with no See all", () => {
    const model = footballProfileModel(FOOTBALL, ORIGIN);
    expect(model.lastTen.record).toBe("1 won, 0 lost, 1 drawn");
    expect(model.lastTen.seeAll).toBeNull();
    expect(
      model.matches.map((row) => [row.title, row.score, row.goals]),
    ).toEqual([
      ["Thursday 5s", "2\u20132", null],
      ["Riffa Ballers", "5\u20133", "3 goals"],
    ]);
  });
});

describe("footballProfileState", () => {
  it("reads NOT_FOUND as the refused state", () => {
    const error = { message: "Player not found", data: { code: "NOT_FOUND" } };
    expect(footballProfileState({ data: undefined, error }, ORIGIN)).toEqual({
      status: "refused",
    });
  });

  it("is ready once data arrives", () => {
    expect(
      footballProfileState({ data: FOOTBALL, error: null }, ORIGIN).status,
    ).toBe("ready");
  });
});
