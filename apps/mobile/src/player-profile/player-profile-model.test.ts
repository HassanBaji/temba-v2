import { describe, expect, it } from "vitest";
import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import { playerProfileModel, playerProfileState } from "./player-profile-model";

const ORIGIN = "https://api.example.com";
const fixtures = createPlayerProfileFixtures();

describe("playerProfileModel", () => {
  it("builds the header, Level card and Overall from one payload", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN);
    expect(model.name).toBe("Elin Nilsson");
    expect(model.imageUri).toBeNull();
    expect(model.subtitle).toBe("Padel, plays at Padelhuset Bromma");
    expect(model.level).toMatchObject({ kind: "rated", displayBand: "B" });
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
