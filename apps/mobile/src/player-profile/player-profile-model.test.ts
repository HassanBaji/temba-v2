import { describe, expect, it } from "vitest";
import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import type { RouterOutputs } from "../trpc/react";
import {
  footballProfileModel,
  footballProfileState,
  playerProfileModel,
  playerProfileState,
  sharedTierView,
} from "./player-profile-model";

const ORIGIN = "https://api.example.com";
const fixtures = createPlayerProfileFixtures();

describe("playerProfileModel", () => {
  it("builds the hero: name, subtitle and the confirmed Level", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN, "en");
    expect(model.name).toBe("Elin Nilsson");
    expect(model.imageUri).toBeNull();
    expect(model.subtitle).toBe("Padel, left side. Plays at Padelhuset Bromma");
    expect(model.level).toMatchObject({
      kind: "level",
      label: "Padel level",
      status: "Confirmed",
      statusDetail: "64 rated matches",
      band: "B-",
      hatched: false,
    });
  });

  it("builds streaks, side, Overall and the record with the viewer", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN, "en");
    expect(model.early).toBeNull();
    expect(model.streaks).toMatchObject({
      current: { value: "4", unit: "wins", marks: 4 },
      best: { value: "7", when: "March 2026" },
    });
    expect(model.position).toMatchObject({
      sport: "padel",
      value: "Left side",
      detail: "Played left in 72% of matches",
      court: { left: "ink", right: "paper" },
    });
    expect(model.stats.map((tile) => tile.value)).toEqual([
      "64",
      "41",
      "64%",
      "61%",
    ]);
    expect(model.withViewer).toMatchObject({
      title: "You and Elin",
      columns: [
        { label: "As partners", record: "4–1", detail: "in 5 games" },
        { label: "Against each other", record: "3–2", detail: "to you" },
      ],
      groups: "Both in Tuesday Crew",
    });
    expect(model.partners).toMatchObject({
      title: "Partners",
      rows: [{ name: "Jonas Berg", record: "9–3", percent: 75 }],
    });
  });

  it("builds the Last 10 strip oldest first, three rows and See all", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN, "en");
    expect(model.form.title).toBe("Last 10 games");
    expect(model.form.record).toBe("7–3");
    expect(model.form.slots).toHaveLength(10);
    expect(model.seeAll).toBe("See all 10 games");
    expect(model.rows.map((row) => [row.title, row.sub])).toEqual([
      ["Tuesday Crew", "Thu 1 Oct, with Jonas B"],
      ["Autumn Cup, Round 2", "Mon 28 Sep, with Jonas B"],
      ["Autumn Cup, Semi-final", "Sat 26 Sep, with Jonas B"],
    ]);
    expect(model.rows[0]).toMatchObject({
      score: "6\u20134, 6\u20133",
      detail: "+0.10",
      target: { kind: "match", matchId: "match-2026-10-01" },
    });
  });

  it("leads with the early days below five games, without streaks or partners", () => {
    const model = playerProfileModel(fixtures.provisional, ORIGIN, "en");
    expect(model.early).toMatchObject({ title: "3 games so far" });
    expect(model.streaks).toBeNull();
    expect(model.partners).toBeNull();
    expect(model.stats[2]).toEqual({
      value: "After 5 games",
      label: "Win rate",
      locked: true,
    });
    expect(model.form).toMatchObject({ title: "Games", record: "3 played" });
    expect(model.rows).toHaveLength(3);
    expect(model.seeAll).toBeNull();
    expect(model.level).toMatchObject({
      status: "Provisional",
      hatched: true,
    });
  });

  it("shows no Level and no games for a new player", () => {
    const model = playerProfileModel(fixtures.newPlayer, ORIGIN, "en");
    expect(model.level).toMatchObject({ kind: "none", value: "No Level yet" });
    expect(model.early).toMatchObject({ title: "No games yet", since: null });
    expect(model.rows).toEqual([]);
    expect(model.form.slots.every((slot) => slot === "not-played")).toBe(true);
  });

  it("hides the you-and-them card on the viewer's own profile", () => {
    expect(playerProfileModel(fixtures.self, ORIGIN, "en").withViewer).toBe(
      null,
    );
  });
});

describe("playerProfileState", () => {
  it("reads NOT_FOUND as the refused state", () => {
    const error = { message: "Player not found", data: { code: "NOT_FOUND" } };
    expect(
      playerProfileState({ data: undefined, error }, ORIGIN, "en"),
    ).toEqual({
      status: "refused",
    });
  });

  it("keeps other failures as errors", () => {
    const error = { message: "Network down", data: { code: "INTERNAL" } };
    expect(
      playerProfileState({ data: undefined, error }, ORIGIN, "en"),
    ).toEqual({
      status: "error",
      message: "Network down",
    });
  });

  it("is loading before data arrives", () => {
    expect(
      playerProfileState({ data: undefined, error: null }, ORIGIN, "en"),
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
  historyHidden: false,
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
      levelMove: null,
      game: {
        name: "Thursday 5s",
        hasCustomName: true,
        windowStart: null,
        windowEnd: null,
        groupName: null,
        venueName: "Riffa Pitch",
      },
      canOpenGame: false,
    },
    {
      matchId: "match-1",
      gameId: "game-1",
      playedAt: "2026-10-17T17:00:00.000Z",
      outcome: "won",
      score: { us: 5, them: 3 },
      goals: 3,
      levelMove: null,
      game: {
        name: "Thursday 5s",
        hasCustomName: true,
        windowStart: null,
        windowEnd: null,
        groupName: "Riffa Ballers",
        venueName: "Riffa Pitch",
      },
      canOpenGame: true,
    },
  ],
  partners: [],
  withViewer: null,
};

describe("footballProfileModel", () => {
  it("builds the football hero with the starting Level", () => {
    const model = footballProfileModel(FOOTBALL, ORIGIN, "en");
    expect(model.subtitle).toBe("Football, forward. Plays at Riffa Pitch");
    expect(model.imageUri).toBe(`${ORIGIN}/media/users/ali.jpg`);
    expect(model.level).toMatchObject({
      kind: "level",
      label: "Football level",
      band: "C+",
      status: "Starting level",
      statusDetail: "Set at sign up",
      hatched: true,
    });
    expect(model.position).toMatchObject({
      sport: "football",
      value: "Forward",
      spot: "fwd",
    });
    expect(model.stats.map((tile) => tile.value)).toEqual([
      "2",
      "1",
      "3",
      "After 5 games",
    ]);
  });

  it("lists every early football Match, opening only the Games it may", () => {
    const model = footballProfileModel(FOOTBALL, ORIGIN, "en");
    expect(model.form.record).toBe("2 played");
    expect(model.seeAll).toBeNull();
    expect(
      model.rows.map((row) => [row.title, row.score, row.detail, row.target]),
    ).toEqual([
      ["Thursday 5s", "2\u20132", null, null],
      [
        "Riffa Ballers",
        "5\u20133",
        "3 goals",
        { kind: "game", gameId: "game-1" },
      ],
    ]);
  });

  it("reads W–D–L once established", () => {
    const model = footballProfileModel(
      {
        ...FOOTBALL,
        overall: { played: 8, won: 5, lost: 2, drawn: 1, goals: 6 },
      },
      ORIGIN,
      "en",
    );
    expect(model.form).toMatchObject({
      title: "Last 10 games",
      record: "1–1–0",
    });
    expect(model.stats[1]).toMatchObject({ value: "5–1–2" });
  });

  it("reads the football hero in Arabic", () => {
    const model = footballProfileModel(FOOTBALL, ORIGIN, "ar");
    expect(model.subtitle).toBe("كرة القدم، مهاجم. يلعب في Riffa Pitch");
    expect(model.position).toMatchObject({ value: "مهاجم" });
  });
});

describe("footballProfileState", () => {
  it("reads NOT_FOUND as the refused state", () => {
    const error = { message: "Player not found", data: { code: "NOT_FOUND" } };
    expect(
      footballProfileState({ data: undefined, error }, ORIGIN, "en"),
    ).toEqual({
      status: "refused",
    });
  });

  it("is ready once data arrives", () => {
    expect(
      footballProfileState({ data: FOOTBALL, error: null }, ORIGIN, "en")
        .status,
    ).toBe("ready");
  });
});

describe("sharedTierView", () => {
  const data = {
    player: { name: "Mahmood Ali", isViewer: false },
    sharedGroupTiers: [
      {
        groupId: "t1",
        name: "Thursday Football",
        imageUrl: null,
        memberCount: 13,
        rankedCount: 11,
        band: "kanaad" as const,
        place: 6,
        points: 1201,
        provisional: false,
        gamesOfFive: 5,
      },
    ],
  } as unknown as NonNullable<Parameters<typeof sharedTierView>[1]>;

  it("draws the fish only on football", () => {
    expect(sharedTierView("football", data, "en")?.rows[0]?.caption).toBe(
      "Kanaad, #6 of 13",
    );
    expect(sharedTierView("padel", data, "en")).toBeNull();
  });

  it("draws nothing when the viewer shares no tier Group", () => {
    expect(
      sharedTierView("football", { ...data, sharedGroupTiers: [] }, "en"),
    ).toBeNull();
  });
});
